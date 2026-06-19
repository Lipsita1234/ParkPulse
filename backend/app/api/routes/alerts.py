"""Live Alert Feed — real-time high-risk location alerts and enforcement events."""
from datetime import datetime, timedelta
import random
from fastapi import APIRouter
from app.ml.risk_engine import get_risk_data
from app.ml.hotspot_engine import get_hotspots
from app.ml.data_processor import get_processor

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

# Alert type templates
ALERT_TEMPLATES = [
    {"type": "HIGH_RISK_SURGE", "icon": "alert-triangle", "color": "#ef4444", "message": "High-risk surge detected"},
    {"type": "HOTSPOT_ACTIVE", "icon": "map-pin", "color": "#f97316", "message": "Active hotspot cluster"},
    {"type": "PEAK_HOUR", "icon": "clock", "color": "#f59e0b", "message": "Peak enforcement window"},
    {"type": "VIOLATION_SPIKE", "icon": "trending-up", "color": "#ef4444", "message": "Violation spike detected"},
    {"type": "PATROL_ALERT", "icon": "shield", "color": "#8b5cf6", "message": "Patrol recommended"},
]


def _minutes_ago(n: int) -> str:
    t = datetime.now() - timedelta(minutes=n)
    return t.strftime("%H:%M")


@router.get("/live")
async def live_alerts():
    """Return current live alerts based on risk engine data."""
    df = get_risk_data()
    hotspots = get_hotspots()
    alerts = []
    now = datetime.now()

    # Generate alerts from high-risk locations
    if df is not None:
        high_risk = df[df["risk_level"] == "High"].head(8)
        for i, (_, row) in enumerate(high_risk.iterrows()):
            loc = str(row.get("location", "Unknown"))[:45]
            score = float(row.get("risk_score", 0))
            minutes_ago = random.randint(1, 45)
            alert_type = ALERT_TEMPLATES[i % len(ALERT_TEMPLATES)]
            alerts.append({
                "id": f"risk_{i}",
                "type": alert_type["type"],
                "icon": alert_type["icon"],
                "color": alert_type["color"],
                "title": alert_type["message"],
                "location": loc,
                "risk_level": "High",
                "risk_score": round(score, 1),
                "time": _minutes_ago(minutes_ago),
                "minutes_ago": minutes_ago,
                "station": str(row.get("police_station", "Unknown"))[:30],
            })

    # Add medium risk hotspot alerts
    if df is not None:
        medium_risk = df[df["risk_level"] == "Medium"].head(4)
        for i, (_, row) in enumerate(medium_risk.iterrows()):
            loc = str(row.get("location", "Unknown"))[:45]
            score = float(row.get("risk_score", 0))
            minutes_ago = random.randint(10, 90)
            alerts.append({
                "id": f"medium_{i}",
                "type": "HOTSPOT_ACTIVE",
                "icon": "map-pin",
                "color": "#f97316",
                "title": "Medium risk zone active",
                "location": loc,
                "risk_level": "Medium",
                "risk_score": round(score, 1),
                "time": _minutes_ago(minutes_ago),
                "minutes_ago": minutes_ago,
                "station": str(row.get("police_station", "Unknown"))[:30],
            })

    # Check current hour for peak hour alert
    current_hour = now.hour
    if 7 <= current_hour <= 10 or 17 <= current_hour <= 21:
        alerts.insert(0, {
            "id": "peak_hour_now",
            "type": "PEAK_HOUR",
            "icon": "clock",
            "color": "#f59e0b",
            "title": "⚡ PEAK ENFORCEMENT WINDOW ACTIVE",
            "location": "City-wide",
            "risk_level": "High",
            "risk_score": 90,
            "time": now.strftime("%H:%M"),
            "minutes_ago": 0,
            "station": "All Stations",
        })

    # Sort by minutes_ago ascending (most recent first)
    alerts.sort(key=lambda a: a["minutes_ago"])

    return {
        "total": len(alerts),
        "alerts": alerts[:10],
        "updated_at": now.isoformat(),
        "peak_hour_active": 7 <= current_hour <= 10 or 17 <= current_hour <= 21,
    }


@router.get("/feed")
async def alert_feed(limit: int = 15):
    """Return formatted alert feed items."""
    proc = get_processor()
    df_risk = get_risk_data()
    alerts = []
    now = datetime.now()

    if df_risk is not None:
        top = df_risk[df_risk["risk_level"].isin(["High", "Medium"])].head(limit)
        for i, (_, row) in enumerate(top.iterrows()):
            risk = str(row.get("risk_level", "Medium"))
            loc = str(row.get("location", "Unknown"))[:50]
            score = float(row.get("risk_score", 0))
            minutes_offset = random.randint(2, 120)
            severity = "critical" if risk == "High" else "warning"
            alerts.append({
                "id": f"feed_{i}",
                "severity": severity,
                "risk_level": risk,
                "location": loc,
                "risk_score": round(score, 1),
                "message": f"Risk score {score:.0f} — {risk} enforcement priority",
                "station": str(row.get("police_station", "N/A")),
                "timestamp": (now - timedelta(minutes=minutes_offset)).isoformat(),
                "time_display": _minutes_ago(minutes_offset),
            })

    alerts.sort(key=lambda a: a["risk_score"], reverse=True)
    return {"feed": alerts[:limit], "generated_at": now.isoformat()}


@router.get("/summary")
async def alert_summary():
    """Summary count of current alerts by severity."""
    df = get_risk_data()
    now = datetime.now()
    current_hour = now.hour

    if df is None:
        return {"critical": 0, "warning": 0, "info": 0, "total": 0}

    critical = len(df[df["risk_level"] == "High"])
    warning = len(df[df["risk_level"] == "Medium"])
    info = len(df[df["risk_level"] == "Low"])

    return {
        "critical": critical,
        "warning": warning,
        "info": info,
        "total": critical + warning + info,
        "peak_hour": 7 <= current_hour <= 10 or 17 <= current_hour <= 21,
    }
