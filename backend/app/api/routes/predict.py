"""Prediction routes — ML inference + SHAP local explanation."""
from datetime import datetime, timedelta
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.ml.ml_engine import predict, get_model_cache, _lookup_rolling_features, _lookup_location_coords, SoftVotingEnsemble
from app.ml.shap_engine import explain_prediction, get_global_importance
from app.ml.data_processor import get_processor

import numpy as np
import pandas as pd

router = APIRouter(prefix="/api/predict", tags=["Predict"])


class PredictionInput(BaseModel):
    location: Optional[str] = ""
    date: Optional[str] = ""         # YYYY-MM-DD
    time: Optional[str] = ""         # HH:MM
    vehicle_type: Optional[str] = "CAR"
    police_station: Optional[str] = ""
    junction: Optional[str] = "No Junction"


def _enrich_input(inp: PredictionInput) -> dict:
    """Convert user input to feature dict with rolling features and grid lookup."""
    proc = get_processor()
    df = proc.df if proc else None

    data = {}

    # Parse datetime
    hour, day_of_week, month = 12, 0, 1
    query_date = datetime.now()
    try:
        if inp.date and inp.time:
            dt = datetime.strptime(f"{inp.date} {inp.time}", "%Y-%m-%d %H:%M")
            hour = dt.hour
            day_of_week = dt.weekday()
            month = dt.month
            query_date = dt
        elif inp.date:
            dt = datetime.strptime(inp.date, "%Y-%m-%d")
            day_of_week = dt.weekday()
            month = dt.month
            query_date = dt
    except Exception:
        pass

    data["hour"] = hour
    data["day_of_week"] = day_of_week
    data["month"] = month

    # Cyclical encodings
    data["hour_sin"] = float(np.sin(2 * np.pi * hour / 24))
    data["hour_cos"] = float(np.cos(2 * np.pi * hour / 24))
    data["month_sin"] = float(np.sin(2 * np.pi * month / 12))
    data["month_cos"] = float(np.cos(2 * np.pi * month / 12))
    data["dow_sin"] = float(np.sin(2 * np.pi * day_of_week / 7))
    data["dow_cos"] = float(np.cos(2 * np.pi * day_of_week / 7))

    # Coordinate & grid lookup
    location = inp.location or ""
    lat, lon = _lookup_location_coords(location)
    grid_id = f"{round(lat, 2)}_{round(lon, 2)}"
    data["grid_id"] = grid_id

    # Rolling/cumulative feature lookup from historical data
    rolling_features = _lookup_rolling_features(location, grid_id, hour, day_of_week, query_date)
    data.update(rolling_features)

    data["vehicle_type"] = inp.vehicle_type or "CAR"
    data["police_station"] = inp.police_station or "Unknown"
    data["junction"] = inp.junction or "No Junction"

    return data


@router.post("")
async def predict_risk(inp: PredictionInput):
    data = _enrich_input(inp)
    result = predict(data)

    # SHAP local explanation
    cache = get_model_cache()
    if cache and "best_model" in cache:
        feature_cols = cache["feature_cols"]
        encoders = cache["encoders"]
        scaler = cache.get("scaler")
        row = {}
        for col in feature_cols:
            row[col] = data.get(col, 0)

        # Handle categorical encoding for SHAP input
        for cat_col in ["vehicle_type", "police_station", "junction", "grid_id"]:
            enc_col = cat_col + "_enc"
            if enc_col in feature_cols and cat_col in encoders:
                le = encoders[cat_col]
                val = str(data.get(cat_col, ""))
                if val in le.classes_:
                    row[enc_col] = int(le.transform([val])[0])
                else:
                    row[enc_col] = 0

        X_inp = pd.DataFrame([row])[feature_cols].fillna(0)
        if scaler:
            X_inp_scaled = pd.DataFrame(scaler.transform(X_inp), columns=feature_cols)
        else:
            X_inp_scaled = X_inp

        # For SHAP, use the LightGBM component if model is an ensemble
        shap_model = cache["best_model"]
        if isinstance(shap_model, SoftVotingEnsemble):
            shap_model = shap_model.get_lgbm_model()

        le_target = encoders.get("target")
        class_names = le_target.classes_.tolist() if le_target else ["Low", "Medium", "High"]
        shap_result = explain_prediction(shap_model, X_inp_scaled, class_names)
    else:
        shap_result = {"shap_available": False, "reasons": []}

    return {
        **result,
        "input": inp.dict(),
        "explanation": shap_result,
        "recommendation": _get_recommendation(result.get("prediction", "Low")),
    }


def _get_recommendation(risk_level: str) -> dict:
    recs = {
        "High": {
            "priority": "IMMEDIATE",
            "officers": "3–5 traffic officers",
            "monitoring_time": "Continuous monitoring required",
            "actions": [
                "Deploy 3–5 traffic officers immediately",
                "Increase CCTV monitoring frequency",
                "Install temporary no-parking barriers",
                "Increase patrol frequency every 30 minutes",
                "Issue on-the-spot fines",
            ],
        },
        "Medium": {
            "priority": "SCHEDULED",
            "officers": "1–2 traffic officers",
            "monitoring_time": "Monitor during peak hours (07:00–10:00 and 17:00–21:00)",
            "actions": [
                "Schedule periodic inspections every 2 hours",
                "Increase awareness notices in the area",
                "Monitor closely during peak hours",
                "Issue parking advisory notices",
            ],
        },
        "Low": {
            "priority": "ROUTINE",
            "officers": "Standard patrol",
            "monitoring_time": "Normal surveillance schedule",
            "actions": [
                "Continue normal surveillance",
                "Log observations for trend analysis",
            ],
        },
    }
    return recs.get(risk_level, recs["Low"])


@router.get("/forecast/24h")
async def forecast_24h():
    """Pre-compute top 10 high-risk location-time predictions for next 24 hours."""
    proc = get_processor()
    cache = get_model_cache()
    now = datetime.now()

    if proc is None or proc.df is None:
        # Return placeholder data if data not loaded yet
        return {
            "status": "data_loading",
            "forecast": [],
            "generated_at": now.isoformat(),
        }

    df = proc.df
    results = []

    # Get top 15 locations by violation count
    col = "location_short" if "location_short" in df.columns else "location"
    top_locs = df[col].value_counts().head(15).index.tolist()

    # We also need the full location names for the rolling feature lookup
    # location_short -> location mapping
    loc_map = {}
    if col == "location_short" and "location" in df.columns:
        for _, row in df[[col, "location"]].drop_duplicates(subset=[col]).iterrows():
            loc_map[row[col]] = row["location"]

    # Precompute historical violation counts per (location, hour) for accurate scoring
    # This gives us ground-truth density to vary risk scores meaningfully
    hour_col = "hour" if "hour" in df.columns else None
    loc_hour_counts = {}
    max_loc_hour_count = 1  # avoid div-by-zero

    if hour_col and col in df.columns:
        for (l, h), grp in df.groupby([col, hour_col]):
            loc_hour_counts[(str(l), int(h))] = len(grp)
        if loc_hour_counts:
            max_loc_hour_count = max(loc_hour_counts.values())

    for loc in top_locs:
        # Get police station and coordinates for this location
        loc_mask = df[col].str.contains(loc[:20], case=False, na=False) if loc else pd.Series([False] * len(df))
        loc_data = df[loc_mask]
        ps = str(loc_data["police_station"].iloc[0]) if not loc_data.empty and "police_station" in df.columns else "Unknown"

        # Get the full location name for rolling feature lookup
        full_location = loc_map.get(loc, loc)

        # Get coordinates for grid
        lat, lon = _lookup_location_coords(full_location)
        grid_id = f"{round(lat, 2)}_{round(lon, 2)}"

        # Key hours to check (morning rush, midday, evening rush, night)
        check_hours = [7, 8, 9, 12, 17, 18, 19, 20, 21, 22]

        for hour in check_hours:
            # Day of week for tomorrow
            tomorrow = now + timedelta(days=1)
            dow = tomorrow.weekday()
            month = tomorrow.month

            # Rolling feature lookup
            rolling_feats = _lookup_rolling_features(full_location, grid_id, hour, dow, tomorrow)

            data = {
                "hour": hour,
                "day_of_week": dow,
                "month": month,
                "hour_sin": float(np.sin(2 * np.pi * hour / 24)),
                "hour_cos": float(np.cos(2 * np.pi * hour / 24)),
                "month_sin": float(np.sin(2 * np.pi * month / 12)),
                "month_cos": float(np.cos(2 * np.pi * month / 12)),
                "dow_sin": float(np.sin(2 * np.pi * dow / 7)),
                "dow_cos": float(np.cos(2 * np.pi * dow / 7)),
                "vehicle_type": "CAR",
                "police_station": ps,
                "junction": "No Junction",
                "grid_id": grid_id,
                **rolling_feats,
            }

            try:
                pred = predict(data)
                risk = pred.get("prediction", "Low")
                conf = pred.get("confidence", 0.5)

                if risk in ("High", "Medium"):
                    # Use actual historical violation density for this (location, hour)
                    # as the primary driver of risk_score — this is what varies per card
                    hist_count = loc_hour_counts.get((str(loc), int(hour)), 0)
                    density_ratio = hist_count / max_loc_hour_count  # 0.0 – 1.0

                    # Blend: 70% historical density + 30% model confidence signal
                    conf_norm = max(0.0, min(1.0, (float(conf) - 40.0) / 60.0))
                    blend = 0.70 * density_ratio + 0.30 * conf_norm

                    if risk == "High":
                        r_score = int(71 + blend * 28)   # 71–99
                    else:
                        r_score = int(41 + blend * 29)   # 41–69

                    results.append({
                        "location": loc[:45],
                        "hour": hour,
                        "time_label": f"{hour:02d}:00–{hour+1:02d}:00",
                        "risk_level": risk,
                        "risk_score": r_score,
                        "confidence": round(conf, 1),
                        "date": tomorrow.strftime("%A, %d %b"),
                    })
            except Exception:
                pass

    # Sort by risk_score descending (High first, then score)
    results.sort(key=lambda x: (0 if x["risk_level"] == "High" else 1, -x["risk_score"]))
    return {
        "status": "ready",
        "forecast": results[:12],
        "generated_at": now.isoformat(),
        "forecast_date": (now + timedelta(days=1)).strftime("%A, %d %b %Y"),
    }


@router.get("/model-info")
async def model_info():
    cache = get_model_cache()
    if not cache:
        return {"status": "not_trained"}
    return {
        "status": "ready",
        "best_model": cache.get("best_name"),
        "results": cache.get("results", {}),
        "global_importance": get_global_importance(),
    }
