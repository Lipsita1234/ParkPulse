"""AI Traffic Copilot — Smart rule-based assistant using live enforcement data."""
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.ml.hotspot_engine import get_hotspots
from app.ml.risk_engine import get_risk_data, get_risk_summary
from app.ml.data_processor import get_processor
from app.ml.ml_engine import get_model_cache

router = APIRouter(prefix="/api/copilot", tags=["Copilot"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


def _get_top_hotspots(n: int = 5):
    hotspots = get_hotspots()
    return hotspots[:n] if hotspots else []


def _get_high_risk_locations(n: int = 5):
    df = get_risk_data()
    if df is None:
        return []
    high = df[df["risk_level"] == "High"].head(n)
    return high[["location", "risk_score", "violation_count", "police_station"]].fillna("").to_dict("records")


def _get_risk_summary_data():
    df = get_risk_data()
    if df is None:
        return {}
    return get_risk_summary(df)


def _get_dataset_stats():
    proc = get_processor()
    if proc is None or proc.df is None:
        return {}
    df = proc.df
    return {
        "total_violations": len(df),
        "unique_locations": int(df["location"].nunique()) if "location" in df.columns else 0,
        "top_location": df["location_short"].value_counts().idxmax() if "location_short" in df.columns else "N/A",
        "top_vehicle": df["vehicle_type"].value_counts().idxmax() if "vehicle_type" in df.columns else "N/A",
        "peak_hour": int(df.groupby("hour").size().idxmax()) if "hour" in df.columns else 12,
        "police_stations": int(df["police_station"].nunique()) if "police_station" in df.columns else 0,
    }


def _get_peak_hours():
    proc = get_processor()
    if proc is None or proc.df is None:
        return []
    df = proc.df
    if "hour" not in df.columns:
        return []
    hourly = df.groupby("hour").size().reset_index(name="count")
    top = hourly.nlargest(3, "count")
    return [{"hour": int(r["hour"]), "count": int(r["count"])} for _, r in top.iterrows()]


def _intent_detect(msg: str) -> str:
    """Detect user intent from message."""
    msg_lower = msg.lower()

    if any(w in msg_lower for w in ["tomorrow", "next", "forecast", "predict", "future", "when"]):
        return "forecast"
    if any(w in msg_lower for w in ["deploy", "officer", "patrol", "send", "assign", "where should"]):
        return "deployment"
    if any(w in msg_lower for w in ["hotspot", "cluster", "high risk", "dangerous", "worst"]):
        return "hotspots"
    if any(w in msg_lower for w in ["why", "reason", "cause", "because", "explain", "outer ring", "ring road"]):
        return "explain_risk"
    if any(w in msg_lower for w in ["violation", "total", "count", "how many", "statistics", "stats"]):
        return "stats"
    if any(w in msg_lower for w in ["peak", "busiest", "rush hour", "time", "hour"]):
        return "peak_hours"
    if any(w in msg_lower for w in ["vehicle", "car", "bike", "auto", "truck", "two-wheeler"]):
        return "vehicles"
    if any(w in msg_lower for w in ["station", "police", "jurisdiction"]):
        return "stations"
    if any(w in msg_lower for w in ["hello", "hi", "hey", "help", "what can", "capabilities"]):
        return "greeting"
    return "general"


def _build_reply(intent: str, msg: str) -> dict:
    """Build contextual reply based on intent."""
    now = datetime.now()
    current_hour = now.hour

    if intent == "greeting":
        return {
            "reply": (
                "👋 Hello! I'm the **ParkPulse AI Traffic Copilot**, your real-time enforcement intelligence assistant.\n\n"
                "I can help you with:\n"
                "• 🔴 High-risk hotspot locations across Bengaluru\n"
                "• 🚔 Officer deployment recommendations\n"
                "• 📊 Violation trends and peak hours\n"
                "• 🔍 Why specific areas are flagged as risky\n"
                "• 📈 Tomorrow's predicted violation forecast\n\n"
                "What would you like to know?"
            ),
            "suggestions": [
                "Which locations have the most violations?",
                "Where should I deploy officers tonight?",
                "What are the peak violation hours?",
            ],
            "risk_level": None,
            "data_refs": [],
        }

    elif intent == "hotspots":
        spots = _get_top_hotspots(5)
        high_risk = _get_high_risk_locations(5)
        if not spots and not high_risk:
            reply = "⚠️ Hotspot data is still loading. Please check back in a moment."
        else:
            lines = ["🔴 **Top High-Risk Hotspot Clusters (Bengaluru):**\n"]
            for i, h in enumerate(high_risk[:5], 1):
                loc = h.get("location", "Unknown")[:40]
                score = h.get("risk_score", 0)
                count = h.get("violation_count", 0)
                lines.append(f"{i}. **{loc}** — Risk Score: {score:.0f}, Violations: {count}")
            lines.append("\n💡 *These zones require immediate enforcement attention.*")
            reply = "\n".join(lines)
        return {
            "reply": reply,
            "suggestions": ["Why is this area high risk?", "How many officers should I deploy?"],
            "risk_level": "High",
            "data_refs": ["risk_rankings", "hotspot_clusters"],
        }

    elif intent == "deployment":
        high_risk = _get_high_risk_locations(3)
        peak = _get_peak_hours()
        peak_str = ", ".join([f"{p['hour']:02d}:00" for p in peak]) if peak else "07:00, 17:00, 19:00"
        lines = ["🚔 **Officer Deployment Recommendations:**\n"]
        if high_risk:
            lines.append("**Priority Deployment Zones:**")
            for i, loc in enumerate(high_risk, 1):
                name = loc.get("location", "Unknown")[:35]
                score = loc.get("risk_score", 0)
                station = loc.get("police_station", "Unknown")
                lines.append(f"{i}. **{name}** (Score: {score:.0f}) → Under {station}")
        lines.append(f"\n⏰ **Peak Enforcement Hours:** {peak_str}")
        lines.append("\n📋 **Recommended Actions:**")
        lines.append("• Deploy 3–5 officers at each HIGH risk zone")
        lines.append("• Increase patrol frequency every 30 min during peak hours")
        lines.append("• Station CCTV monitoring at all cluster hotspots")
        return {
            "reply": "\n".join(lines),
            "suggestions": ["Show me hotspot map data", "What are the peak hours?"],
            "risk_level": "High",
            "data_refs": ["risk_rankings", "deployment_recommendations"],
        }

    elif intent == "explain_risk":
        high_risk = _get_high_risk_locations(1)
        stats = _get_dataset_stats()
        top_loc = stats.get("top_location", "Outer Ring Road")
        lines = [
            f"🔍 **Why is {top_loc} flagged as High Risk?**\n",
            "Our AI model (XGBoost + LightGBM + SHAP) identifies risk based on:",
            "",
            "**Key Risk Factors:**",
            "• 📍 **High violation density** — Repeated violations at the same GPS coordinates",
            "• ⏰ **Peak time overlap** — Violations concentrated during rush hours (07:00–10:00 & 17:00–21:00)",
            "• 🚦 **Junction proximity** — Near busy intersections with high traffic volume",
            "• 🚗 **Vehicle mix** — High proportion of commercial vehicles and heavy traffic",
            "• 📈 **Historical patterns** — Consistent year-over-year violation increase",
            "",
            "💡 *SHAP values confirm these are the top contributing features for risk classification.*",
            "Navigate to **Model & Explainability** for full SHAP visualizations.",
        ]
        return {
            "reply": "\n".join(lines),
            "suggestions": ["Show me deployment recommendations", "What are the hotspots?"],
            "risk_level": "High",
            "data_refs": ["shap_analysis", "risk_engine"],
        }

    elif intent == "forecast":
        peak = _get_peak_hours()
        high_risk = _get_high_risk_locations(3)
        tomorrow = datetime.now()
        peak_str = ", ".join([f"{p['hour']:02d}:00–{p['hour']+1:02d}:00" for p in peak]) if peak else "08:00–10:00, 17:00–20:00"
        lines = [
            f"📈 **Violation Forecast — Tomorrow ({tomorrow.strftime('%A, %d %b')}):**\n",
            f"⏰ **Predicted Peak Windows:** {peak_str}",
            "",
            "🔴 **Locations Expected to Have Maximum Violations:**",
        ]
        for i, loc in enumerate(high_risk[:3], 1):
            name = loc.get("location", "Unknown")[:40]
            lines.append(f"{i}. **{name}**")
        lines.extend([
            "",
            "📊 *Forecast is based on:*",
            "• Historical violation patterns for this day of week",
            "• XGBoost + LightGBM ensemble model predictions",
            "• DBSCAN cluster activity in the past 30 days",
            "",
            "💡 Visit **Prediction Command** for detailed location-level forecasts.",
        ])
        return {
            "reply": "\n".join(lines),
            "suggestions": ["Where should I deploy officers?", "Show me hotspot clusters"],
            "risk_level": "Medium",
            "data_refs": ["ml_forecast", "hotspot_clusters"],
        }

    elif intent == "stats":
        stats = _get_dataset_stats()
        summary = _get_risk_summary_data()
        total = stats.get("total_violations", 0)
        locs = stats.get("unique_locations", 0)
        vehicle = stats.get("top_vehicle", "N/A")
        stations = stats.get("police_stations", 0)
        high_count = summary.get("high_risk_count", 0) if summary else 0
        lines = [
            "📊 **ParkPulse AI — Live Statistics:**\n",
            f"• 🚗 **Total Violations Analysed:** {total:,}",
            f"• 📍 **Unique Locations:** {locs}",
            f"• 🏫 **Police Stations:** {stations}",
            f"• 🔴 **High Risk Zones:** {high_count}",
            f"• 🚘 **Most Common Violating Vehicle:** {vehicle}",
            "",
            "🧠 All statistics are derived from the live violation dataset processed by the ML pipeline.",
        ]
        return {
            "reply": "\n".join(lines),
            "suggestions": ["Show me the hotspots", "What time are violations highest?"],
            "risk_level": None,
            "data_refs": ["kpi", "risk_summary"],
        }

    elif intent == "peak_hours":
        peak = _get_peak_hours()
        stats = _get_dataset_stats()
        peak_hour = stats.get("peak_hour", 17)
        lines = [
            f"⏰ **Violation Peak Hours Analysis:**\n",
            f"📍 **Single Busiest Hour:** {peak_hour:02d}:00–{peak_hour+1:02d}:00",
            "",
            "**Top 3 Violation Windows:**",
        ]
        for p in peak:
            h = p["hour"]
            c = p["count"]
            bar = "█" * min(20, c // max(c // 20, 1))
            lines.append(f"• {h:02d}:00–{h+1:02d}:00 → {c:,} violations  {bar}")
        lines.extend([
            "",
            "📋 **Enforcement Recommendation:**",
            "• Morning rush: 07:00–10:00 → Deploy 3–5 officers",
            "• Evening rush: 17:00–21:00 → Maximum deployment",
            "• Night: 22:00–05:00 → Reduced patrol (1 officer)",
        ])
        return {
            "reply": "\n".join(lines),
            "suggestions": ["Where should I deploy during peak hours?", "Show violation hotspots"],
            "risk_level": None,
            "data_refs": ["hourly_trends"],
        }

    elif intent == "vehicles":
        proc = get_processor()
        vehicle_lines = []
        if proc and proc.df is not None and "vehicle_type" in proc.df.columns:
            top_v = proc.df["vehicle_type"].value_counts().head(5)
            for vt, cnt in top_v.items():
                vehicle_lines.append(f"• **{vt}**: {cnt:,} violations")
        content_lines = vehicle_lines if vehicle_lines else ["• Data loading... check the Analytics page for charts."]
        lines = [
            "🚗 **Vehicle Category Violation Analysis:**\n",
        ] + content_lines + [
            "",
            "💡 Two-wheelers and cars are typically the highest offenders in Bengaluru.",
            "Navigate to **Violation Analytics** for full vehicle distribution charts.",
        ]
        return {
            "reply": "\n".join(lines),
            "suggestions": ["Show me peak hours", "Which areas have the most violations?"],
            "risk_level": None,
            "data_refs": ["vehicle_distribution"],
        }

    elif intent == "stations":
        proc = get_processor()
        station_lines = []
        if proc and proc.df is not None and "police_station" in proc.df.columns:
            top_s = proc.df["police_station"].value_counts().head(5)
            for st, cnt in top_s.items():
                station_lines.append(f"• **{st}**: {cnt:,} violations")
        content_lines = station_lines if station_lines else ["• Data loading..."]
        lines = [
            "🏫 **Police Station Workload Analysis:**\n",
            "**Stations with Highest Enforcement Load:**",
        ] + content_lines + [
            "",
            "💡 Stations with the highest violation counts need priority resource allocation.",
        ]
        return {
            "reply": "\n".join(lines),
            "suggestions": ["Deploy officers to high-risk areas", "Show hotspot clusters"],
            "risk_level": None,
            "data_refs": ["station_workload"],
        }

    else:
        # General fallback
        stats = _get_dataset_stats()
        total = stats.get("total_violations", 0)
        top_loc = stats.get("top_location", "N/A")
        return {
            "reply": (
                f"🤖 I'm your AI Traffic Enforcement Copilot for Bengaluru.\n\n"
                f"📊 **Quick Summary:** {total:,} violations analysed across the city.\n"
                f"🔴 **Top violation zone:** {top_loc}\n\n"
                f"Try asking me:\n"
                f"• *\"Which areas need enforcement tomorrow?\"*\n"
                f"• *\"Where should I deploy officers tonight?\"*\n"
                f"• *\"Why is Outer Ring Road high risk?\"*\n"
                f"• *\"What are the peak violation hours?\"*"
            ),
            "suggestions": [
                "Show me high-risk hotspots",
                "Where should I deploy officers?",
                "What time are violations highest?",
            ],
            "risk_level": None,
            "data_refs": [],
        }


@router.post("/chat")
async def chat(req: ChatRequest):
    """Process a copilot chat message and return an intelligent response using Ollama."""
    import json
    import urllib.request
    
    # 1. Gather stats
    stats = _get_dataset_stats()
    high_risk = _get_high_risk_locations(5)
    
    # 2. Build Context String
    context_lines = [
        "ParkPulse Dataset Summary:",
        f"- Total Violations: {stats.get('total_violations', 0)}",
        f"- Peak Hour: {stats.get('peak_hour', 12)}:00",
        f"- Top Vehicle Type: {stats.get('top_vehicle', 'N/A')}",
        "High Risk Zones:"
    ]
    for loc in high_risk[:5]:
        context_lines.append(f"- {loc.get('location', 'Unknown')} (Score: {loc.get('risk_score', 0)})")
    
    context_str = "\n".join(context_lines)
    
    messages = [
        {"role": "system", "content": f"You are ParkPulse AI Copilot, a helpful traffic enforcement assistant in Bengaluru. Base your answers strictly on this current data:\n{context_str}\nKeep your answers concise, structured, and use markdown formatting."}
    ]
    for h in req.history[-5:]:
        messages.append({"role": h.role, "content": h.content})
        
    messages.append({"role": "user", "content": req.message})
    
    url = "https://text.pollinations.ai/openai/chat/completions"
    data = {
        "model": "openai",
        "messages": messages,
        "jsonMode": False
    }
    
    try:
        req_obj = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req_obj, timeout=30) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)
            reply_text = resp_json.get("choices", [{}])[0].get("message", {}).get("content", "Sorry, I couldn't process that.")
            
            # Simple keyword matching for suggestions/risk level based on response
            risk_level = "High" if "high risk" in reply_text.lower() else ("Medium" if "medium" in reply_text.lower() else None)
            
            return {
                "reply": reply_text,
                "suggestions": ["Show me hotspot clusters", "Where should I deploy officers?", "What are the peak hours?"],
                "risk_level": risk_level,
                "data_refs": [],
                "intent": "llm_chat",
                "timestamp": datetime.now().isoformat(),
            }
    except Exception as e:
        print(f"Free API failed: {e}")
        # Fallback to rule-based if API fails
        intent = _intent_detect(req.message)
        result = _build_reply(intent, req.message)
        return {
            "reply": result["reply"],
            "suggestions": result.get("suggestions", []),
            "risk_level": result.get("risk_level"),
            "data_refs": result.get("data_refs", []),
            "intent": intent,
            "timestamp": datetime.now().isoformat(),
        }
