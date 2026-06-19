"""ParkPulse AI — FastAPI Application Entry Point"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import find_dataset, ALLOWED_ORIGINS
from app.ml.data_processor import init_processor, get_processor
from app.ml.hotspot_engine import init_hotspots
from app.ml.risk_engine import init_risk_engine
from app.ml.ml_engine import load_saved_model, train_models, get_model_cache
from app.api.routes import analytics, hotspots, risk, predict, dataset, reports, options, copilot, alerts


def startup_pipeline():
    """Run all ML pipeline steps on startup."""
    print("=" * 60)
    print("  ParkPulse AI — Initialising Intelligence Pipeline")
    print("=" * 60)

    # 1. Find & load dataset
    dataset_path = find_dataset()
    if not dataset_path:
        print("[STARTUP] WARNING: No dataset found. API will return empty data.")
        return

    # 2. Process data (Module 1)
    proc = init_processor(dataset_path)
    df = proc.df

    # 3. DBSCAN Hotspots (Module 3)
    df_clustered = init_hotspots(df)

    # 4. Risk Engine (Module 4) — uses clustered df
    init_risk_engine(df_clustered)

    # 5. ML — try load saved model, else train
    if not load_saved_model():
        print("[STARTUP] Training ML models for first time (may take a few minutes)...")
        try:
            cache = train_models(df_clustered)
            print(f"[STARTUP] Best model: {cache.get('best_name')}")
        except Exception as e:
            print(f"[STARTUP] ML training failed: {e}")
    else:
        print("[STARTUP] Using saved model.")

    print("[STARTUP] Pipeline ready [OK]")
    print("=" * 60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run startup pipeline in background thread to avoid blocking the event loop
    asyncio.create_task(asyncio.to_thread(startup_pipeline))
    yield


app = FastAPI(
    title="ParkPulse AI",
    description="AI-Powered Smart Parking Enforcement Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(analytics.router)
app.include_router(hotspots.router)
app.include_router(risk.router)
app.include_router(predict.router)
app.include_router(dataset.router)
app.include_router(reports.router)
app.include_router(options.router)
app.include_router(copilot.router)
app.include_router(alerts.router)


@app.get("/")
async def root():
    return {
        "app": "ParkPulse AI",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health():
    proc = get_processor()
    cache = get_model_cache()
    return {
        "status": "ok",
        "data_loaded": proc is not None and proc.df is not None,
        "records": len(proc.df) if proc and proc.df is not None else 0,
        "model_ready": bool(cache),
    }
