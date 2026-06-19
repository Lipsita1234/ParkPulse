"""
ParkPulse AI — Module 4: AI-Based Parking Risk Engine
Computes composite Parking Risk Score (0–100) for every location.
"""
import numpy as np
import pandas as pd
from typing import Optional

_risk_cache: Optional[pd.DataFrame] = None


def compute_risk_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build a location-level risk score from:
      - Violation frequency (40%)
      - Peak hour occurrence rate (20%)
      - Junction importance (15%)
      - Police station workload (15%)
      - Historical recurrence (10%)
    """
    if "location" not in df.columns:
        return pd.DataFrame()

    g = df.groupby("location").agg(
        lat=("latitude", "mean"),
        lon=("longitude", "mean"),
        violation_count=("location", "count"),
        peak_hour_rate=("is_peak_hour", "mean") if "is_peak_hour" in df.columns else ("location", lambda x: 0),
        station_workload=("station_workload", "mean") if "station_workload" in df.columns else ("location", lambda x: 0),
        dominant_vehicle=("vehicle_type", lambda x: x.mode()[0] if not x.empty else "Unknown") if "vehicle_type" in df.columns else ("location", lambda x: "Unknown"),
        police_station=("police_station", lambda x: x.mode()[0] if not x.empty else "Unknown") if "police_station" in df.columns else ("location", lambda x: "Unknown"),
        cluster_id=("cluster_id", "first") if "cluster_id" in df.columns else ("location", lambda x: -1),
        location_short=("location_short", "first") if "location_short" in df.columns else ("location", lambda x: ""),
    ).reset_index()

    # ── Normalise each component to 0–100 ──
    def norm(s: pd.Series) -> pd.Series:
        mn, mx = s.min(), s.max()
        if mx == mn:
            return pd.Series([50.0] * len(s), index=s.index)
        return (s - mn) / (mx - mn) * 100

    freq_score = norm(g["violation_count"])
    peak_score = norm(g["peak_hour_rate"]) if "peak_hour_rate" in g.columns else pd.Series(50, index=g.index)
    station_score = norm(g["station_workload"]) if "station_workload" in g.columns else pd.Series(50, index=g.index)

    # Hotspot bonus: +100 if in a cluster (gets multiplied by 0.25 weight later)
    hotspot_bonus = g["cluster_id"].apply(lambda x: 100 if x >= 0 else 0)

    g["risk_score"] = (
        freq_score * 0.40 +
        peak_score * 0.20 +
        station_score * 0.15 +
        hotspot_bonus * 0.25
    ).clip(0, 100).round(1)

    def classify(s):
        if s >= 71:
            return "High"
        elif s >= 41:
            return "Medium"
        else:
            return "Low"

    g["risk_level"] = g["risk_score"].apply(classify)
    g["risk_color"] = g["risk_level"].map({"High": "#EF4444", "Medium": "#F97316", "Low": "#22C55E"})

    return g.sort_values("risk_score", ascending=False)


def get_risk_summary(risk_df: pd.DataFrame) -> dict:
    if risk_df is None or risk_df.empty:
        return {"high_risk_count": 0, "medium_risk_count": 0, "low_risk_count": 0, "avg_risk_score": 0.0, "top_high_risk": []}

    top_high = risk_df[risk_df["risk_level"] == "High"].head(10)[
        ["location", "risk_score", "violation_count", "police_station"]
    ].to_dict("records")
    
    # Clean numpy types
    clean_top = []
    for r in top_high:
        clean_top.append({
            "location": str(r["location"]),
            "risk_score": float(r["risk_score"]),
            "violation_count": int(r["violation_count"]),
            "police_station": str(r["police_station"]),
        })

    return {
        "high_risk_count": int((risk_df["risk_level"] == "High").sum()),
        "medium_risk_count": int((risk_df["risk_level"] == "Medium").sum()),
        "low_risk_count": int((risk_df["risk_level"] == "Low").sum()),
        "avg_risk_score": float(round(risk_df["risk_score"].mean(), 1)),
        "top_high_risk": clean_top,
    }


def init_risk_engine(df: pd.DataFrame) -> pd.DataFrame:
    global _risk_cache
    print("[RiskEngine] Computing parking risk scores...")
    _risk_cache = compute_risk_scores(df)
    print(f"[RiskEngine] Scored {len(_risk_cache)} locations")
    return _risk_cache


def get_risk_data() -> Optional[pd.DataFrame]:
    return _risk_cache
