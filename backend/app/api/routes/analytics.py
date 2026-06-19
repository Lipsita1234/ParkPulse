"""Analytics routes — KPI cards, trends, vehicle/location intelligence."""
import math
from fastapi import APIRouter
from app.ml.data_processor import get_processor

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


def safe_val(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return 0
    return v


@router.get("/kpi")
async def get_kpi():
    proc = get_processor()
    if proc is None or proc.df is None:
        return {"error": "Data not loaded"}
    df = proc.df
    from app.ml.hotspot_engine import get_hotspots
    hotspots = get_hotspots()

    top_loc = df["location_short"].value_counts().idxmax() if "location_short" in df.columns else "N/A"
    top_vehicle = df["vehicle_type"].value_counts().idxmax() if "vehicle_type" in df.columns else "N/A"

    return {
        "total_violations": len(df),
        "unique_locations": int(df["location"].nunique()) if "location" in df.columns else 0,
        "police_stations": int(df["police_station"].nunique()) if "police_station" in df.columns else 0,
        "detected_hotspots": len(hotspots),
        "highest_risk_location": top_loc,
        "most_common_vehicle": top_vehicle,
        "quality_report": proc.get_quality_report(),
    }


@router.get("/trends/hourly")
async def hourly_trends():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "hour" not in df.columns:
        return []
    trend = df.groupby("hour").size().reset_index(name="count")
    return [{"hour": int(r["hour"]), "count": int(r["count"])} for _, r in trend.iterrows()]


@router.get("/trends/daily")
async def daily_trends():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "day_name" not in df.columns:
        return []
    order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    trend = df.groupby("day_name").size().reset_index(name="count")
    trend["day_name"] = pd.Categorical(trend["day_name"], categories=order, ordered=True)
    trend = trend.sort_values("day_name")
    return [{"day": r["day_name"], "count": int(r["count"])} for _, r in trend.iterrows()]


@router.get("/trends/monthly")
async def monthly_trends():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "month" not in df.columns:
        return []
    MONTHS = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
              7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}
    trend = df.groupby("month").size().reset_index(name="count")
    return [{"month": MONTHS.get(int(r["month"]), str(int(r["month"]))), "count": int(r["count"])} for _, r in trend.iterrows()]


@router.get("/trends/seasonal")
async def seasonal_trends():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "season" not in df.columns:
        return []
    trend = df.groupby("season").size().reset_index(name="count")
    return [{"season": r["season"], "count": int(r["count"])} for _, r in trend.iterrows()]


@router.get("/vehicles")
async def vehicle_distribution():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "vehicle_type" not in df.columns:
        return []
    dist = df["vehicle_type"].value_counts().head(10).reset_index()
    dist.columns = ["vehicle_type", "count"]
    return dist.to_dict("records")


@router.get("/locations/top")
async def top_locations():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    col = "location_short" if "location_short" in df.columns else "location"
    top = df[col].value_counts().head(20).reset_index()
    top.columns = ["location", "count"]
    return top.to_dict("records")


@router.get("/stations")
async def station_workload():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "police_station" not in df.columns:
        return []
    ws = df["police_station"].value_counts().reset_index()
    ws.columns = ["station", "count"]
    return ws.to_dict("records")


@router.get("/junctions")
async def junction_analysis():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "junction" not in df.columns:
        return []
    jn = df[df["junction"].str.lower() != "no junction"]["junction"].value_counts().head(15).reset_index()
    jn.columns = ["junction", "count"]
    return jn.to_dict("records")


@router.get("/violations")
async def violation_types():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "violation" not in df.columns:
        return []
    vt = df["violation"].value_counts().head(15).reset_index()
    vt.columns = ["violation", "count"]
    return vt.to_dict("records")


import pandas as pd
