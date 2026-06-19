"""
ParkPulse AI — Module 3: Geospatial Hotspot Intelligence
Uses DBSCAN clustering on lat/lon to detect high-density parking violation zones.
"""
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from typing import Optional


EARTH_RADIUS_KM = 6371.0
# 150m eps in radians
EPS_KM = 0.15
EPS_RAD = EPS_KM / EARTH_RADIUS_KM
MIN_SAMPLES = 5


def run_dbscan(df: pd.DataFrame) -> pd.DataFrame:
    """Run DBSCAN on lat/lon and assign cluster IDs."""
    coords = df[["latitude", "longitude"]].dropna().values
    coords_rad = np.radians(coords)
    db = DBSCAN(eps=EPS_RAD, min_samples=MIN_SAMPLES, algorithm="ball_tree", metric="haversine")
    labels = db.fit_predict(coords_rad)
    df = df.copy()
    df.loc[df[["latitude", "longitude"]].dropna().index, "cluster_id"] = labels
    df["cluster_id"] = df["cluster_id"].fillna(-1).astype(int)
    return df


def compute_hotspots(df: pd.DataFrame) -> list[dict]:
    """
    For each cluster (excluding noise = -1), compute:
    - centroid lat/lon
    - violation count
    - dominant vehicle type
    - peak hour
    - responsible police station
    - risk score (0–100)
    - risk level: High / Medium / Low
    """
    df = df[df["cluster_id"] >= 0].copy()
    if df.empty:
        return []

    hotspots = []
    max_count = df.groupby("cluster_id").size().max()

    for cluster_id, grp in df.groupby("cluster_id"):
        count = len(grp)

        # Centroid
        centroid_lat = grp["latitude"].mean()
        centroid_lon = grp["longitude"].mean()

        # Location name: most frequent
        location_name = (
            grp["location_short"].mode()[0]
            if "location_short" in grp.columns and not grp["location_short"].empty
            else grp["location"].mode()[0] if "location" in grp.columns else "Unknown"
        )

        # Dominant vehicle
        dominant_vehicle = (
            grp["vehicle_type"].mode()[0] if "vehicle_type" in grp.columns else "Unknown"
        )

        # Peak hour
        peak_hour = int(grp["hour"].mode()[0]) if "hour" in grp.columns else 0

        # Police station
        police_station = (
            grp["police_station"].mode()[0] if "police_station" in grp.columns else "Unknown"
        )

        # Risk score (0–100) based on count density
        density_score = min(100, int((count / max_count) * 100))

        # Peak hour bonus
        peak_bonus = 10 if 17 <= peak_hour <= 21 else 5 if 7 <= peak_hour <= 10 else 0

        # Junction bonus
        junction_bonus = 0
        if "junction" in grp.columns:
            junctions = grp["junction"].dropna()
            no_junctions = (junctions.str.lower() == "no junction").sum()
            has_junction_ratio = 1 - (no_junctions / max(len(junctions), 1))
            junction_bonus = int(has_junction_ratio * 10)

        raw_score = density_score + peak_bonus + junction_bonus
        risk_score = min(100, raw_score)

        # Risk level
        if risk_score >= 71:
            risk_level = "High"
            risk_color = "#EF4444"
        elif risk_score >= 41:
            risk_level = "Medium"
            risk_color = "#F97316"
        else:
            risk_level = "Low"
            risk_color = "#22C55E"

        # Top violations
        top_violations = {}
        if "violation" in grp.columns:
            vc = grp["violation"].value_counts().head(3).to_dict()
            top_violations = {str(k): int(v) for k, v in vc.items()}

        hotspots.append({
            "cluster_id": int(cluster_id),
            "centroid_lat": float(round(centroid_lat, 6)),
            "centroid_lon": float(round(centroid_lon, 6)),
            "location_name": str(location_name),
            "violation_count": int(count),
            "dominant_vehicle": str(dominant_vehicle),
            "peak_hour": int(peak_hour),
            "police_station": str(police_station),
            "risk_score": int(risk_score),
            "risk_level": str(risk_level),
            "risk_color": str(risk_color),
            "top_violations": top_violations,
        })

    # Sort by risk score descending
    hotspots.sort(key=lambda x: x["risk_score"], reverse=True)
    return hotspots


def get_heatmap_points(df: pd.DataFrame, sample_n: int = 5000) -> list[list[float]]:
    """Return [lat, lon, intensity] triplets for heatmap rendering."""
    valid = df.dropna(subset=["latitude", "longitude"])
    if len(valid) > sample_n:
        valid = valid.sample(sample_n, random_state=42)
    # Intensity proportional to location_freq (normalised)
    if "location_freq" in valid.columns:
        max_freq = valid["location_freq"].max()
        intensity = (valid["location_freq"] / max_freq).fillna(0.1)
    else:
        intensity = pd.Series([1.0] * len(valid), index=valid.index)
    result = []
    for i, row in valid.iterrows():
        result.append([float(row["latitude"]), float(row["longitude"]), float(intensity.loc[i])])
    return result


_hotspot_cache: Optional[list[dict]] = None
_heatmap_cache: Optional[list] = None


def init_hotspots(df: pd.DataFrame):
    global _hotspot_cache, _heatmap_cache
    print("[HotspotEngine] Running DBSCAN clustering...")
    df_clustered = run_dbscan(df)
    _hotspot_cache = compute_hotspots(df_clustered)
    _heatmap_cache = get_heatmap_points(df_clustered)
    print(f"[HotspotEngine] Found {len(_hotspot_cache)} hotspot clusters")
    return df_clustered


def get_hotspots() -> list[dict]:
    return _hotspot_cache or []


def get_heatmap() -> list:
    return _heatmap_cache or []
