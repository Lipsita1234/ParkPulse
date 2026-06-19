"""Dropdown options — vehicle types, police stations, junctions for prediction form."""
from fastapi import APIRouter
from app.ml.data_processor import get_processor

router = APIRouter(prefix="/api/options", tags=["Options"])


@router.get("")
async def get_options():
    proc = get_processor()
    if proc is None or proc.df is None:
        return {"vehicle_types": [], "police_stations": [], "junctions": [], "locations": []}
    df = proc.df
    return {
        "vehicle_types": sorted(df["vehicle_type"].dropna().unique().tolist()) if "vehicle_type" in df.columns else [],
        "police_stations": sorted(df["police_station"].dropna().unique().tolist()) if "police_station" in df.columns else [],
        "junctions": sorted(df["junction"].dropna().unique().tolist()) if "junction" in df.columns else [],
        "locations": df["location_short"].value_counts().head(50).index.tolist() if "location_short" in df.columns else [],
    }
