"""Risk routes — parking risk scores, rankings, heatmap data."""
from fastapi import APIRouter
from app.ml.risk_engine import get_risk_data, get_risk_summary

router = APIRouter(prefix="/api/risk", tags=["Risk"])


@router.get("")
async def risk_data(limit: int = 50, risk_level: str = None, search: str = None):
    df = get_risk_data()
    if df is None:
        return {"error": "Risk data not available"}
    if risk_level:
        df = df[df["risk_level"] == risk_level.capitalize()]
    if search:
        df = df[df["location"].str.contains(search, case=False, na=False)]
    records = df.head(limit)[
        ["location", "risk_score", "risk_level", "risk_color", "violation_count",
         "dominant_vehicle", "police_station", "lat", "lon"]
    ].fillna("").to_dict("records")
    return {"total": len(df), "data": records}


@router.get("/summary")
async def risk_summary():
    df = get_risk_data()
    if df is None:
        return {"error": "Risk data not available"}
    return get_risk_summary(df)


@router.get("/heatmap")
async def risk_heatmap():
    df = get_risk_data()
    if df is None:
        return {"points": []}
    valid = df.dropna(subset=["lat", "lon"])
    points = [
        [float(r["lat"]), float(r["lon"]), float(r["risk_score"]) / 100]
        for _, r in valid.iterrows()
    ]
    return {"points": points}


@router.get("/rankings")
async def risk_rankings(top: int = 20):
    df = get_risk_data()
    if df is None:
        return []
    cols = ["location", "risk_score", "risk_level", "risk_color", "violation_count", "police_station"]
    return df.head(top)[cols].fillna("").to_dict("records")
