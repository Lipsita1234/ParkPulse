"""Hotspot routes — DBSCAN cluster data and heatmap points."""
from fastapi import APIRouter
from app.ml.hotspot_engine import get_hotspots, get_heatmap

router = APIRouter(prefix="/api/hotspots", tags=["Hotspots"])


@router.get("")
async def list_hotspots(limit: int = 100):
    hotspots = get_hotspots()
    return {
        "total": len(hotspots),
        "hotspots": hotspots[:limit],
    }


@router.get("/heatmap")
async def heatmap_data():
    return {"points": get_heatmap()}


@router.get("/summary")
async def hotspot_summary():
    hotspots = get_hotspots()
    high = [h for h in hotspots if h["risk_level"] == "High"]
    medium = [h for h in hotspots if h["risk_level"] == "Medium"]
    low = [h for h in hotspots if h["risk_level"] == "Low"]
    return {
        "total_clusters": len(hotspots),
        "high_risk": len(high),
        "medium_risk": len(medium),
        "low_risk": len(low),
        "top_5": hotspots[:5],
    }


@router.get("/{cluster_id}")
async def get_hotspot(cluster_id: int):
    hotspots = get_hotspots()
    for h in hotspots:
        if h["cluster_id"] == cluster_id:
            return h
    return {"error": "Hotspot not found"}
