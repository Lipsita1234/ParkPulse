"""
ParkPulse AI — Module 5: Predictive Machine Learning Engine
Trains LightGBM (Optuna-tuned), XGBoost, CatBoost, and a Soft Voting Ensemble.
Auto-selects best model by F1-score (weighted) using temporal train/test split.
"""
import json
import traceback
import warnings
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score, TimeSeriesSplit
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)
import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)

warnings.filterwarnings("ignore")

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from lightgbm import LGBMClassifier
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False

try:
    from catboost import CatBoostClassifier
    HAS_CAT = True
except ImportError:
    HAS_CAT = False

try:
    from imblearn.over_sampling import SMOTE
    HAS_SMOTE = True
except ImportError:
    HAS_SMOTE = False

MODEL_DIR = Path(__file__).parent.parent.parent / "data" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "hour_sin", "hour_cos", "month_sin", "month_cos", "dow_sin", "dow_cos",
    "location_roll_1d", "location_roll_7d", "location_roll_30d", "location_historical_count",
    "location_hour_historical_count", "location_dow_historical_count",
    "grid_roll_1d", "grid_roll_7d", "grid_roll_30d", "grid_historical_count",
]
CATEGORICAL_COLS = ["vehicle_type", "police_station", "junction", "grid_id"]
TARGET_COL = "risk_category"


class _NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles numpy types."""
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        return super().default(obj)

_model_cache: dict = {}
_training_logs: list[str] = []


def _log(msg: str):
    print(msg)
    _training_logs.append(msg)


def _build_training_data(df: pd.DataFrame) -> tuple:
    """Build X, y from the processed dataframe."""
    # Create target: risk_category from risk_score
    if "risk_score" not in df.columns:
        from app.ml.risk_engine import get_risk_data
        risk_df = get_risk_data()
        if risk_df is not None and "location" in df.columns:
            risk_map = dict(zip(risk_df["location"], risk_df["risk_level"]))
            df["risk_level"] = df["location"].map(risk_map).fillna("Low")
        else:
            df["risk_level"] = "Low"
    else:
        def classify(s):
            if s >= 71: return "High"
            elif s >= 41: return "Medium"
            else: return "Low"
        df["risk_level"] = df["risk_score"].apply(classify) if "risk_score" in df.columns else "Low"

    df[TARGET_COL] = df.get("risk_level", "Low")

    # Label encode categoricals
    encoders = {}
    df_enc = df.copy()
    for col in CATEGORICAL_COLS:
        if col in df_enc.columns:
            le = LabelEncoder()
            df_enc[col + "_enc"] = le.fit_transform(df_enc[col].astype(str))
            encoders[col] = le

    feature_cols = [c for c in FEATURE_COLS if c in df_enc.columns]
    for col in CATEGORICAL_COLS:
        enc_col = col + "_enc"
        if enc_col in df_enc.columns:
            feature_cols.append(enc_col)

    X = df_enc[feature_cols].fillna(0)
    le_target = LabelEncoder()
    y = le_target.fit_transform(df_enc[TARGET_COL].astype(str))
    encoders["target"] = le_target

    return X, y, feature_cols, encoders


class SoftVotingEnsemble:
    """Soft voting ensemble that aggregates predicted probabilities from multiple models."""
    def __init__(self, models, weights=None, model_names=None):
        self.models = models
        self.weights = weights if weights else [1.0 / len(models)] * len(models)
        self.model_names = model_names or [type(m).__name__ for m in models]
        self.classes_ = getattr(models[0], "classes_", np.array([0, 1, 2]))

    def predict_proba(self, X):
        probas = []
        for model in self.models:
            p = model.predict_proba(X)
            probas.append(p)
        avg_proba = np.average(probas, axis=0, weights=self.weights)
        return avg_proba

    def predict(self, X):
        proba = self.predict_proba(X)
        return np.argmax(proba, axis=1)

    def get_lgbm_model(self):
        """Return the LightGBM component for SHAP explanations."""
        for model, name in zip(self.models, self.model_names):
            if "lgbm" in name.lower() or "lightgbm" in name.lower():
                return model
        # fallback: return first model
        return self.models[0]


def _optuna_tune_lgbm(X_train, y_train, n_trials=5):
    """Tune LightGBM hyperparameters using Optuna with TimeSeriesSplit CV."""
    _log(f"[MLEngine] Starting Optuna tuning for LightGBM ({n_trials} trials)...")

    def objective(trial):
        params = {
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "max_depth": trial.suggest_int("max_depth", 3, 12),
            "num_leaves": trial.suggest_int("num_leaves", 15, 127),
            "n_estimators": trial.suggest_int("n_estimators", 50, 500),
            "min_child_samples": trial.suggest_int("min_child_samples", 5, 100),
            "subsample": trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            "random_state": 42,
            "verbosity": -1,
            "n_jobs": -1,
        }

        tscv = TimeSeriesSplit(n_splits=5)
        scores = []
        for train_idx, val_idx in tscv.split(X_train):
            X_tr, X_val = X_train.iloc[train_idx], X_train.iloc[val_idx]
            y_tr, y_val = y_train[train_idx], y_train[val_idx]

            # Apply SMOTE only on the training fold
            if HAS_SMOTE:
                try:
                    sm = SMOTE(random_state=42)
                    X_tr_res, y_tr_res = sm.fit_resample(X_tr, y_tr)
                except Exception:
                    X_tr_res, y_tr_res = X_tr, y_tr
            else:
                X_tr_res, y_tr_res = X_tr, y_tr

            model = LGBMClassifier(**params)
            model.fit(X_tr_res, y_tr_res)
            y_pred = model.predict(X_val)
            scores.append(f1_score(y_val, y_pred, average="weighted", zero_division=0))

        return np.mean(scores)

    study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best_params = study.best_params
    best_params["random_state"] = 42
    best_params["verbosity"] = -1
    best_params["n_jobs"] = -1

    _log(f"[MLEngine] Optuna best trial F1: {study.best_value:.4f}")
    param_str = ", ".join(f"{k}={round(v, 4) if isinstance(v, float) else v}" for k, v in best_params.items())
    _log(f"[MLEngine] Optuna best params: {param_str}")

    return best_params


def train_models(df: pd.DataFrame) -> dict:
    global _model_cache, _training_logs
    _training_logs = []
    _log("[MLEngine] Preparing training data...")
    _log("[MLEngine] Using non-leaked features only (no location_freq, station_workload, peak_hour_rate)")

    X, y, feature_cols, encoders = _build_training_data(df)
    _log(f"[MLEngine] Features: {feature_cols}")
    _log(f"[MLEngine] Target classes: {encoders['target'].classes_.tolist()}")
    _log(f"[MLEngine] Dataset shape: {X.shape}")

    # ── Temporal split: train on earlier data, test on later data ──
    # This prevents information leakage across time periods
    if "created_date" in df.columns:
        _log("[MLEngine] Using temporal train/test split (80/20 chronological)")
        sorted_indices = df["created_date"].sort_values().index
        split_idx = int(len(sorted_indices) * 0.8)
        train_idx = sorted_indices[:split_idx]
        test_idx = sorted_indices[split_idx:]
        # Convert y to Series with same index as X for proper mask-based splitting
        y_series = pd.Series(y, index=X.index)
        train_mask = X.index.isin(train_idx)
        test_mask = X.index.isin(test_idx)
        X_train, X_test = X[train_mask], X[test_mask]
        y_train = y_series[train_mask].values
        y_test = y_series[test_mask].values
    else:
        _log("[MLEngine] No date column found, falling back to stratified random split")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

    _log(f"[MLEngine] Train size: {len(X_train)}, Test size: {len(X_test)}")

    # SMOTE for class imbalance - ONLY ON TRAINING DATA to prevent leakage
    X_train_smote, y_train_smote = X_train.copy(), y_train.copy()
    if HAS_SMOTE:
        try:
            sm = SMOTE(random_state=42)
            X_train_smote, y_train_smote = sm.fit_resample(X_train, y_train)
            _log(f"[MLEngine] After SMOTE: {X_train_smote.shape}")
        except Exception as e:
            _log(f"[MLEngine] SMOTE skipped: {e}")

    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train_smote), columns=feature_cols)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=feature_cols)

    # Also scale the non-SMOTE train data for Optuna CV (Optuna does its own SMOTE per fold)
    X_train_scaled_raw = pd.DataFrame(scaler.transform(X_train), columns=feature_cols)

    results = {}
    trained_models = {}

    # ── Optuna-tuned LightGBM ──
    if HAS_LGBM:
        _log("[MLEngine] ===========================================")
        _log("[MLEngine] Phase 1: Optuna Hyperparameter Tuning (LightGBM)")
        _log("[MLEngine] ===========================================")
        best_lgbm_params = _optuna_tune_lgbm(X_train_scaled_raw, y_train, n_trials=2)

        _log("[MLEngine] Training tuned LightGBM on full training set...")
        lgbm = LGBMClassifier(**best_lgbm_params)
        lgbm.fit(X_train_scaled, y_train_smote)
        y_pred_lgbm = lgbm.predict(X_test_scaled)
        results["LightGBM"] = _evaluate(lgbm, X_test_scaled, y_test, y_pred_lgbm, feature_cols, encoders["target"])
        trained_models["LightGBM"] = lgbm
        _log(f"[MLEngine] LightGBM Test F1: {results['LightGBM']['f1']:.4f}")

    # ── XGBoost ──
    if HAS_XGB:
        _log("[MLEngine] Training XGBoost...")
        xgb = XGBClassifier(
            n_estimators=200, max_depth=8, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, eval_metric="mlogloss",
            use_label_encoder=False, verbosity=0, n_jobs=-1
        )
        xgb.fit(X_train_scaled, y_train_smote)
        y_pred_xgb = xgb.predict(X_test_scaled)
        results["XGBoost"] = _evaluate(xgb, X_test_scaled, y_test, y_pred_xgb, feature_cols, encoders["target"])
        trained_models["XGBoost"] = xgb
        _log(f"[MLEngine] XGBoost Test F1: {results['XGBoost']['f1']:.4f}")

    # ── CatBoost ──
    if HAS_CAT:
        _log("[MLEngine] Training CatBoost...")
        cat = CatBoostClassifier(
            iterations=200, depth=8, learning_rate=0.1,
            random_state=42, verbose=0
        )
        cat.fit(X_train_scaled, y_train_smote)
        y_pred_cat = cat.predict(X_test_scaled)
        results["CatBoost"] = _evaluate(cat, X_test_scaled, y_test, y_pred_cat, feature_cols, encoders["target"])
        trained_models["CatBoost"] = cat
        _log(f"[MLEngine] CatBoost Test F1: {results['CatBoost']['f1']:.4f}")

    # ── Random Forest (baseline) ──
    _log("[MLEngine] Training Random Forest (baseline)...")
    rf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
    rf.fit(X_train_scaled, y_train_smote)
    y_pred_rf = rf.predict(X_test_scaled)
    results["RandomForest"] = _evaluate(rf, X_test_scaled, y_test, y_pred_rf, feature_cols, encoders["target"])
    trained_models["RandomForest"] = rf
    _log(f"[MLEngine] RandomForest Test F1: {results['RandomForest']['f1']:.4f}")

    # ── Soft Voting Ensemble ──
    ensemble_models = []
    ensemble_names = []
    ensemble_weights = []

    # Build ensemble from the three boosting models (if available)
    for name in ["LightGBM", "XGBoost", "CatBoost"]:
        if name in trained_models:
            ensemble_models.append(trained_models[name])
            ensemble_names.append(name)
            # Weight by F1 score
            ensemble_weights.append(results[name]["f1"])

    if len(ensemble_models) >= 2:
        _log("[MLEngine] ===========================================")
        _log("[MLEngine] Phase 2: Soft Voting Ensemble")
        _log("[MLEngine] ===========================================")
        # Normalize weights
        total_w = sum(ensemble_weights)
        ensemble_weights = [w / total_w for w in ensemble_weights]
        _log(f"[MLEngine] Ensemble members: {ensemble_names}")
        _log(f"[MLEngine] Ensemble weights: {[round(w, 4) for w in ensemble_weights]}")

        ensemble = SoftVotingEnsemble(ensemble_models, weights=ensemble_weights, model_names=ensemble_names)
        y_pred_ens = ensemble.predict(X_test_scaled)
        results["Ensemble"] = _evaluate_ensemble(ensemble, X_test_scaled, y_test, y_pred_ens, feature_cols, encoders["target"])
        trained_models["Ensemble"] = ensemble
        _log(f"[MLEngine] Ensemble Test F1: {results['Ensemble']['f1']:.4f}")

    # ── Select best ──
    best_name = max(results, key=lambda k: results[k]["f1"])
    best_model = trained_models[best_name]
    _log(f"[MLEngine] ===========================================")
    _log(f"[MLEngine] Champion model: {best_name} (Weighted F1={results[best_name]['f1']:.4f})")
    _log(f"[MLEngine] ===========================================")

    # ── Generate SHAP Explanations ──
    try:
        from app.ml.shap_engine import init_shap, get_global_importance, set_global_importance
        _log("[MLEngine] Generating SHAP Global Feature Importance...")

        # For ensemble, use the LightGBM component for SHAP
        shap_model = best_model
        if isinstance(best_model, SoftVotingEnsemble):
            shap_model = best_model.get_lgbm_model()
            _log("[MLEngine] Using LightGBM component of ensemble for SHAP explanations")

        X_train_df = pd.DataFrame(X_train_scaled, columns=feature_cols)
        init_shap(shap_model, X_train_df)
        # Check if SHAP produced results
        shap_result = get_global_importance()
        if not shap_result:
            raise ValueError("SHAP returned empty global importance")
        _log(f"[MLEngine] SHAP computed importance for {len(shap_result)} features.")
    except Exception as e:
        _log(f"[MLEngine] SHAP initialization failed: {e}")
        _log("[MLEngine] Falling back to model feature_importances_ as global importance...")
        # Use the best model's built-in feature importance as fallback
        from app.ml.shap_engine import set_global_importance
        # Try LightGBM feature importance first
        fallback_name = best_name
        if isinstance(best_model, SoftVotingEnsemble) and "LightGBM" in results:
            fallback_name = "LightGBM"
        best_feat_imp = results.get(fallback_name, {}).get("feature_importance", {})
        if best_feat_imp:
            set_global_importance(best_feat_imp)
            _log(f"[MLEngine] Set fallback global importance from {fallback_name} ({len(best_feat_imp)} features)")

    # ── Save Artifacts ──
    joblib.dump(best_model, MODEL_DIR / "best_model.pkl")
    joblib.dump(encoders, MODEL_DIR / "encoders.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
    joblib.dump(feature_cols, MODEL_DIR / "feature_cols.pkl")
    joblib.dump(best_name, MODEL_DIR / "best_name.pkl")

    clean_results = {k: {kk: vv for kk, vv in v.items() if kk != "model"} for k, v in results.items()}
    try:
        with open(MODEL_DIR / "metrics.json", "w") as f:
            json.dump(clean_results, f, cls=_NumpyEncoder, indent=2)
        _log(f"[MLEngine] Saved metrics.json ({len(clean_results)} models)")

        from app.ml.shap_engine import get_global_importance
        shap_data = get_global_importance()
        with open(MODEL_DIR / "shap_importance.json", "w") as f:
            json.dump(shap_data, f, cls=_NumpyEncoder, indent=2)
        _log(f"[MLEngine] Saved shap_importance.json ({len(shap_data)} features)")
    except Exception as e:
        _log(f"[MLEngine] Failed to save JSON artifacts: {e}")
        _log(f"[MLEngine] Traceback: {traceback.format_exc()}")

    _log("[MLEngine] Models and metrics saved.")

    _model_cache = {
        "best_name": best_name,
        "best_model": best_model,
        "encoders": encoders,
        "scaler": scaler,
        "feature_cols": feature_cols,
        "results": clean_results,
        "training_logs": list(_training_logs),
    }
    return _model_cache


def _evaluate(model, X_test, y_test, y_pred, feature_cols, le_target) -> dict:
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
    cm = confusion_matrix(y_test, y_pred).tolist()
    classes = le_target.classes_.tolist()

    # Feature importances
    feat_imp = {}
    if hasattr(model, "feature_importances_"):
        for col, imp in zip(feature_cols, model.feature_importances_):
            feat_imp[col] = round(float(imp), 4)
        feat_imp = dict(sorted(feat_imp.items(), key=lambda x: -x[1]))

    return {
        "model": model,
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "confusion_matrix": cm,
        "classes": classes,
        "feature_importance": feat_imp,
    }


def _evaluate_ensemble(ensemble, X_test, y_test, y_pred, feature_cols, le_target) -> dict:
    """Evaluate ensemble model (no feature_importances_ attribute)."""
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
    cm = confusion_matrix(y_test, y_pred).tolist()
    classes = le_target.classes_.tolist()

    # Use LightGBM feature importance from the ensemble as proxy
    feat_imp = {}
    lgbm_model = ensemble.get_lgbm_model()
    if hasattr(lgbm_model, "feature_importances_"):
        for col, imp in zip(feature_cols, lgbm_model.feature_importances_):
            feat_imp[col] = round(float(imp), 4)
        feat_imp = dict(sorted(feat_imp.items(), key=lambda x: -x[1]))

    return {
        "model": ensemble,
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "confusion_matrix": cm,
        "classes": classes,
        "feature_importance": feat_imp,
    }


def load_saved_model() -> bool:
    """Load previously trained model from disk."""
    global _model_cache
    try:
        from app.ml.shap_engine import set_global_importance

        model_path = MODEL_DIR / "best_model.pkl"
        metrics_path = MODEL_DIR / "metrics.json"
        shap_path = MODEL_DIR / "shap_importance.json"
        best_name_path = MODEL_DIR / "best_name.pkl"

        if not model_path.exists():
            print("[MLEngine] No saved model file found.")
            return False

        best_model = joblib.load(model_path)
        encoders = joblib.load(MODEL_DIR / "encoders.pkl")
        scaler = joblib.load(MODEL_DIR / "scaler.pkl")
        feature_cols = joblib.load(MODEL_DIR / "feature_cols.pkl")

        # Load best_name -- must match the keys in metrics.json
        if best_name_path.exists():
            best_name = joblib.load(best_name_path)
            print(f"[MLEngine] Loaded best_name from disk: {best_name}")
        else:
            # Fallback: map model class name -> results key for backward compat
            _CLASS_TO_KEY = {
                "RandomForestClassifier": "RandomForest",
                "XGBClassifier": "XGBoost",
                "LGBMClassifier": "LightGBM",
                "CatBoostClassifier": "CatBoost",
                "SoftVotingEnsemble": "Ensemble",
            }
            model_class = type(best_model).__name__
            best_name = _CLASS_TO_KEY.get(model_class, model_class)
            print(f"[MLEngine] best_name.pkl not found, mapped {model_class} -> {best_name}")

        # Load persisted metrics
        results = {}
        if metrics_path.exists():
            with open(metrics_path, "r") as f:
                results = json.load(f)
            print(f"[MLEngine] Loaded metrics.json with {len(results)} model results.")
        else:
            print("[MLEngine] WARNING: metrics.json not found — dashboard will show empty metrics.")
            # Return False to trigger a retrain so metrics get generated
            return False

        # Load persisted SHAP importance
        if shap_path.exists():
            with open(shap_path, "r") as f:
                shap_data = json.load(f)
            if shap_data:
                set_global_importance(shap_data)
                print(f"[MLEngine] Loaded shap_importance.json with {len(shap_data)} features.")
            else:
                print("[MLEngine] WARNING: shap_importance.json is empty -- will use feature_importances_ fallback.")
                # Use the best model's feature_importance from metrics as fallback
                best_feat_imp = results.get(best_name, {}).get("feature_importance", {})
                if best_feat_imp:
                    set_global_importance(best_feat_imp)
                    print(f"[MLEngine] Set fallback global importance from {best_name} ({len(best_feat_imp)} features)")
        else:
            print("[MLEngine] WARNING: shap_importance.json not found.")
        # Initialize the local SHAP explainer
        try:
            from app.ml.shap_engine import init_explainer
            init_explainer(best_model)
        except Exception as e:
            print(f"[MLEngine] Failed to load SHAP explainer: {e}")

        _model_cache = {
            "best_model": best_model,
            "encoders": encoders,
            "scaler": scaler,
            "feature_cols": feature_cols,
            "best_name": best_name,
            "results": results,
            "training_logs": ["Loaded from saved model."],
        }
        print("[MLEngine] Loaded saved model and metrics from disk.")
        return True
    except Exception as e:
        print(f"[MLEngine] No saved model found: {e}")
        print(f"[MLEngine] Traceback: {traceback.format_exc()}")
        return False


def _lookup_rolling_features(location: str, grid_id: str, hour: int, day_of_week: int, query_date=None) -> dict:
    """Look up rolling/cumulative features for a location from historical data.

    At inference time, we query the historical dataset to compute approximate
    rolling and cumulative counts for the given location and grid.
    """
    from app.ml.data_processor import get_processor
    proc = get_processor()
    features = {
        "location_roll_1d": 0.0, "location_roll_7d": 0.0, "location_roll_30d": 0.0,
        "location_historical_count": 0.0, "location_hour_historical_count": 0.0,
        "location_dow_historical_count": 0.0,
        "grid_roll_1d": 0.0, "grid_roll_7d": 0.0, "grid_roll_30d": 0.0,
        "grid_historical_count": 0.0,
    }

    if proc is None or proc.df is None:
        return features

    df = proc.df

    if query_date is None:
        from datetime import datetime
        query_date = datetime.now()

    # Location-level features
    if "location" in df.columns and "created_date" in df.columns:
        loc_mask = df["location"] == location
        loc_data = df[loc_mask]

        if not loc_data.empty:
            # Historical count: total records for this location before the query date
            before_date = loc_data[loc_data["created_date"] < query_date]
            features["location_historical_count"] = float(len(before_date))

            # Rolling counts
            if not before_date.empty:
                one_day_ago = query_date - pd.Timedelta(days=1)
                seven_days_ago = query_date - pd.Timedelta(days=7)
                thirty_days_ago = query_date - pd.Timedelta(days=30)
                features["location_roll_1d"] = float(len(before_date[before_date["created_date"] >= one_day_ago]))
                features["location_roll_7d"] = float(len(before_date[before_date["created_date"] >= seven_days_ago]))
                features["location_roll_30d"] = float(len(before_date[before_date["created_date"] >= thirty_days_ago]))

            # Location + hour pattern
            if "hour" in df.columns:
                loc_hour_data = before_date[before_date["hour"] == hour] if not before_date.empty else pd.DataFrame()
                features["location_hour_historical_count"] = float(len(loc_hour_data))

            # Location + day of week pattern
            if "day_of_week" in df.columns:
                loc_dow_data = before_date[before_date["day_of_week"] == day_of_week] if not before_date.empty else pd.DataFrame()
                features["location_dow_historical_count"] = float(len(loc_dow_data))

    # Grid-level features
    if "grid_id" in df.columns and "created_date" in df.columns:
        grid_mask = df["grid_id"] == grid_id
        grid_data = df[grid_mask]

        if not grid_data.empty:
            before_date = grid_data[grid_data["created_date"] < query_date]
            features["grid_historical_count"] = float(len(before_date))

            if not before_date.empty:
                one_day_ago = query_date - pd.Timedelta(days=1)
                seven_days_ago = query_date - pd.Timedelta(days=7)
                thirty_days_ago = query_date - pd.Timedelta(days=30)
                features["grid_roll_1d"] = float(len(before_date[before_date["created_date"] >= one_day_ago]))
                features["grid_roll_7d"] = float(len(before_date[before_date["created_date"] >= seven_days_ago]))
                features["grid_roll_30d"] = float(len(before_date[before_date["created_date"] >= thirty_days_ago]))

    return features


def _lookup_location_coords(location: str) -> tuple:
    """Look up lat/lon for a location from historical data averages.
    Returns (latitude, longitude) or Bengaluru center defaults.
    """
    from app.ml.data_processor import get_processor
    proc = get_processor()
    default_lat, default_lon = 12.98, 77.59  # Bengaluru center

    if proc is None or proc.df is None:
        return default_lat, default_lon

    df = proc.df
    if "location" not in df.columns or "latitude" not in df.columns:
        return default_lat, default_lon

    loc_data = df[df["location"] == location]
    if loc_data.empty:
        # Try partial match
        loc_data = df[df["location"].str.contains(location[:20], case=False, na=False)]

    if not loc_data.empty:
        return float(loc_data["latitude"].mean()), float(loc_data["longitude"].mean())

    return default_lat, default_lon


def predict(input_data: dict) -> dict:
    """Run inference for a single input."""
    if not _model_cache:
        return {"error": "Model not trained yet. Please train the model first."}

    model = _model_cache["best_model"]
    encoders = _model_cache["encoders"]
    feature_cols = _model_cache["feature_cols"]
    scaler = _model_cache.get("scaler")

    row = {}
    # Core time features
    hour = int(input_data.get("hour", 12))
    day_of_week = int(input_data.get("day_of_week", 0))
    month = int(input_data.get("month", 1))

    row["hour"] = hour
    row["day_of_week"] = day_of_week
    row["is_weekend"] = 1 if day_of_week in [5, 6] else 0
    row["month"] = month
    row["is_peak_hour"] = 1 if 7 <= hour <= 10 or 17 <= hour <= 21 else 0

    # Cyclical encodings
    row["hour_sin"] = float(np.sin(2 * np.pi * hour / 24))
    row["hour_cos"] = float(np.cos(2 * np.pi * hour / 24))
    row["month_sin"] = float(np.sin(2 * np.pi * month / 12))
    row["month_cos"] = float(np.cos(2 * np.pi * month / 12))
    row["dow_sin"] = float(np.sin(2 * np.pi * day_of_week / 7))
    row["dow_cos"] = float(np.cos(2 * np.pi * day_of_week / 7))

    # Rolling/cumulative features (from input or lookup)
    rolling_keys = [
        "location_roll_1d", "location_roll_7d", "location_roll_30d",
        "location_historical_count", "location_hour_historical_count",
        "location_dow_historical_count",
        "grid_roll_1d", "grid_roll_7d", "grid_roll_30d", "grid_historical_count",
    ]
    for key in rolling_keys:
        if key in input_data:
            row[key] = float(input_data[key])
        else:
            row[key] = 0.0

    # Categorical features
    for col in ["vehicle_type", "police_station", "junction", "grid_id"]:
        enc_col = col + "_enc"
        if enc_col in feature_cols and col in encoders:
            le = encoders[col]
            val = str(input_data.get(col, ""))
            if val in le.classes_:
                row[enc_col] = int(le.transform([val])[0])
            else:
                row[enc_col] = 0

    X = pd.DataFrame([row])[feature_cols].fillna(0)

    if scaler:
        X_scaled = scaler.transform(X)
    else:
        X_scaled = X

    proba = model.predict_proba(X_scaled)[0]
    pred_idx = int(np.argmax(proba))
    le_target = encoders["target"]
    pred_label = le_target.classes_[pred_idx]
    confidence = round(float(proba[pred_idx]) * 100, 1)

    prob_dict = {le_target.classes_[i]: round(float(p) * 100, 1) for i, p in enumerate(proba)}

    return {
        "prediction": pred_label,
        "confidence": confidence,
        "probabilities": prob_dict,
        "model_used": _model_cache.get("best_name", "Unknown"),
    }



def get_model_cache() -> dict:
    return _model_cache
