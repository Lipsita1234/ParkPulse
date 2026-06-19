"""
ParkPulse AI — Module 6: Explainable AI Engine (SHAP)
Provides global feature importance and local per-prediction explanations.
"""
import warnings
import numpy as np
import pandas as pd
from typing import Optional

warnings.filterwarnings("ignore")

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

_shap_explainer = None
_shap_values = None
_global_importance: Optional[dict] = None


def init_shap(model, X_train: pd.DataFrame) -> None:
    global _shap_explainer, _shap_values, _global_importance
    if not HAS_SHAP:
        print("[SHAP] SHAP not installed, skipping.")
        return

    print("[SHAP] Initialising SHAP explainer...")
    try:
        # If the model is a SoftVotingEnsemble, extract LightGBM component
        shap_model = model
        if hasattr(model, "get_lgbm_model"):
            shap_model = model.get_lgbm_model()
            print("[SHAP] Detected ensemble model — using LightGBM component for TreeExplainer")

        sample = X_train.sample(min(500, len(X_train)), random_state=42)
        _shap_explainer = shap.TreeExplainer(shap_model)
        _shap_values = _shap_explainer.shap_values(sample)

        # Global importance: mean |SHAP| per feature
        if isinstance(_shap_values, list):
            # multi-class: average across classes
            avg_shap = np.mean([np.abs(sv) for sv in _shap_values], axis=0)
            mean_importance = avg_shap.mean(axis=0)
        elif isinstance(_shap_values, np.ndarray) and len(_shap_values.shape) == 3:
            # shape (num_samples, num_features, num_classes)
            # average absolute values across classes (axis 2), then across samples (axis 0)
            avg_shap = np.mean(np.abs(_shap_values), axis=2)
            mean_importance = avg_shap.mean(axis=0)
        else:
            avg_shap = np.abs(_shap_values)
            mean_importance = avg_shap.mean(axis=0)
        feat_names = sample.columns.tolist()
        _global_importance = dict(
            sorted(
                {f: round(float(v), 4) for f, v in zip(feat_names, mean_importance)}.items(),
                key=lambda x: -x[1],
            )
        )
        print(f"[SHAP] Global importance computed for {len(feat_names)} features.")
    except Exception as e:
        print(f"[SHAP] Error initialising SHAP: {e}")


def init_explainer(model) -> None:
    global _shap_explainer
    if not HAS_SHAP:
        return
    try:
        shap_model = model
        if hasattr(model, "get_lgbm_model"):
            shap_model = model.get_lgbm_model()
        _shap_explainer = shap.TreeExplainer(shap_model)
        print("[SHAP] Explainer successfully initialised from saved model.")
    except Exception as e:
        print(f"[SHAP] Failed to initialise explainer: {e}")


def explain_prediction(model, X_input: pd.DataFrame, class_names: list) -> dict:
    """Return local SHAP explanation for a single prediction."""
    if not HAS_SHAP or _shap_explainer is None:
        return {
            "shap_available": False,
            "reasons": _rule_based_reasons(X_input),
        }

    try:
        shap_vals = _shap_explainer.shap_values(X_input)
        feat_names = X_input.columns.tolist()

        if isinstance(shap_vals, list):
            # pick the class with highest SHAP values
            class_idx = int(np.argmax([np.abs(sv[0]).sum() for sv in shap_vals]))
            vals = shap_vals[class_idx][0]
        elif isinstance(shap_vals, np.ndarray) and len(shap_vals.shape) == 3:
            # pick class with highest SHAP values for the first sample
            class_idx = int(np.argmax([np.abs(shap_vals[0, :, c]).sum() for c in range(shap_vals.shape[2])]))
            vals = shap_vals[0, :, class_idx]
        else:
            vals = shap_vals[0]

        contributions = {f: round(float(v), 4) for f, v in zip(feat_names, vals)}
        sorted_contribs = sorted(contributions.items(), key=lambda x: -abs(x[1]))

        top_reasons = []
        for feat, val in sorted_contribs[:5]:
            direction = "increases" if val > 0 else "decreases"
            feat_display = feat.replace("_enc", "").replace("_", " ").title()
            feat_val = X_input[feat].values[0]
            top_reasons.append({
                "feature": feat_display,
                "shap_value": val,
                "direction": direction,
                "description": _describe_feature(feat, feat_val, val),
            })

        return {
            "shap_available": True,
            "top_contributions": contributions,
            "top_reasons": top_reasons,
            "global_importance": _global_importance or {},
        }
    except Exception as e:
        return {
            "shap_available": False,
            "error": str(e),
            "reasons": _rule_based_reasons(X_input),
        }


def _describe_feature(feat: str, value, shap_val: float) -> str:
    """Generate human-readable explanation for a feature contribution."""
    direction = "high" if shap_val > 0 else "low"
    descriptions = {
        "location_freq": f"This area has {'very high' if value > 500 else 'moderate'} historical violation frequency ({int(value)} records), significantly raising risk.",
        "hour": f"Violations at hour {int(value)}:00 {'coincide with peak traffic periods' if 7 <= int(value) <= 10 or 17 <= int(value) <= 21 else 'are less common during this time'}.",
        "is_peak_hour": f"{'Peak hour detected' if value == 1 else 'Off-peak hour'} — violations are {'more' if value == 1 else 'less'} likely.",
        "vehicle_freq": f"This vehicle type appears in {int(value)} historical violations.",
        "station_workload": f"The responsible police station handles {int(value)} cases, indicating {'high' if shap_val > 0 else 'normal'} enforcement load.",
        "junction_freq": f"{'This junction has historically high violation density.' if shap_val > 0 else 'This junction shows relatively fewer violations.'}",
        "peak_hour_rate": f"{'High peak-hour occurrence rate' if value > 0.4 else 'Lower peak-hour rate'} for this location ({round(float(value)*100, 0)}%).",
        "is_weekend": f"{'Weekend violations are' if value == 1 else 'Weekday violations are'} {'more' if shap_val > 0 else 'less'} frequent here.",
        "day_of_week": f"Day {int(value)} of the week shows {'elevated' if shap_val > 0 else 'reduced'} risk patterns.",
        "month": f"Month {int(value)} historically shows {'more' if shap_val > 0 else 'fewer'} violations.",
    }
    for key in descriptions:
        if key in feat:
            return descriptions[key]
    return f"Feature '{feat.replace('_', ' ')}' with value {round(float(value), 2)} {'increases' if shap_val > 0 else 'decreases'} risk."


def _rule_based_reasons(X_input: pd.DataFrame) -> list[str]:
    """Fallback: rule-based explanation when SHAP is unavailable."""
    reasons = []
    try:
        row = X_input.iloc[0]
        if "location_freq" in row and row["location_freq"] > 200:
            reasons.append("Area belongs to a frequent violation hotspot with historically high violation count.")
        if "is_peak_hour" in row and row["is_peak_hour"] == 1:
            reasons.append("Violations are predicted during peak traffic hours (morning or evening rush).")
        if "hour" in row:
            h = int(row["hour"])
            reasons.append(f"Time of day ({h}:00) historically shows {'elevated' if 7 <= h <= 10 or 17 <= h <= 21 else 'moderate'} violation frequency.")
        if "station_workload" in row and row["station_workload"] > 1000:
            reasons.append("The responsible police station has high historical workload, indicating enforcement pressure.")
        if "is_weekend" in row and row["is_weekend"] == 1:
            reasons.append("Weekend patterns show increased parking violations in this area.")
    except Exception:
        reasons.append("Prediction based on historical violation patterns and location characteristics.")
    return reasons


def get_global_importance() -> dict:
    return _global_importance or {}


def set_global_importance(data: dict) -> None:
    """Restore SHAP global importance from saved disk artifacts."""
    global _global_importance
    _global_importance = data

