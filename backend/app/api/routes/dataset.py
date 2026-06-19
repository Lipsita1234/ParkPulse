"""Dataset management & model retraining routes."""
import os
import shutil
import asyncio
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse

from app.core.config import PROJECT_DIR, MODEL_DIR

router = APIRouter(prefix="/api/dataset", tags=["Dataset"])

_retrain_status = {"status": "idle", "progress": 0, "logs": [], "error": None}


@router.get("/status")
async def dataset_status():
    from app.ml.data_processor import get_processor
    proc = get_processor()
    if proc is None:
        return {"status": "not_loaded", "records": 0}
    return {
        "status": "loaded",
        "records": len(proc.df) if proc.df is not None else 0,
        "quality": proc.get_quality_report(),
        "dataset_file": str(proc.dataset_path.name),
    }


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".xlsx") or file.filename.endswith(".zip") or file.filename.endswith(".csv.gz")):
        return JSONResponse(status_code=400, content={"error": "Only CSV, Excel, ZIP, or GZ files supported"})
    dest = PROJECT_DIR / file.filename
    with open(dest, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"message": f"File '{file.filename}' uploaded successfully", "path": str(dest)}


@router.post("/retrain")
async def retrain_model(background_tasks: BackgroundTasks):
    global _retrain_status
    _retrain_status = {"status": "running", "progress": 0, "logs": [], "error": None}
    background_tasks.add_task(_run_retraining)
    return {"message": "Retraining started", "status": "running"}


@router.get("/retrain/status")
async def retrain_status():
    return _retrain_status


async def _run_retraining():
    global _retrain_status
    try:
        from app.ml.data_processor import init_processor
        from app.ml.hotspot_engine import init_hotspots
        from app.ml.risk_engine import init_risk_engine
        from app.ml.ml_engine import train_models
        from app.ml.shap_engine import init_shap
        from app.core.config import find_dataset

        _retrain_status["logs"].append("Step 1/5: Finding dataset...")
        _retrain_status["progress"] = 10
        dataset_path = find_dataset()
        if not dataset_path:
            raise RuntimeError("No dataset found")

        _retrain_status["logs"].append(f"Step 2/5: Processing {dataset_path.name}...")
        _retrain_status["progress"] = 20
        proc = init_processor(dataset_path)

        _retrain_status["logs"].append("Step 3/5: Running DBSCAN clustering...")
        _retrain_status["progress"] = 40
        df_clustered = init_hotspots(proc.df)

        _retrain_status["logs"].append("Step 4/5: Computing risk scores...")
        _retrain_status["progress"] = 55
        init_risk_engine(df_clustered)

        _retrain_status["logs"].append("Step 5/5: Training ML models...")
        _retrain_status["progress"] = 70
        cache = train_models(df_clustered)

        _retrain_status["logs"].append("Initialising SHAP explainer...")
        _retrain_status["progress"] = 90

        _retrain_status["logs"].extend(cache.get("training_logs", []))
        _retrain_status["status"] = "completed"
        _retrain_status["progress"] = 100
        _retrain_status["results"] = cache.get("results", {})
        _retrain_status["best_model"] = cache.get("best_name")

    except Exception as e:
        _retrain_status["status"] = "error"
        _retrain_status["error"] = str(e)
        _retrain_status["logs"].append(f"ERROR: {str(e)}")
