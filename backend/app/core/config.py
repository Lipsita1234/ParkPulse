import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
PROJECT_DIR = BASE_DIR.parent  # ParkPulse/

DATA_DIR = PROJECT_DIR  # CSV is in the project root
MODEL_DIR = BASE_DIR / "data" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]

CSV_FILENAME = None  # auto-detected

def find_dataset() -> Path | None:
    """Auto-detect the first CSV/Excel file in the project folder."""
    for ext in ["*.csv", "*.xlsx", "*.xls"]:
        files = list(PROJECT_DIR.glob(ext))
        if files:
            # prefer largest file (most likely the dataset)
            return max(files, key=lambda f: f.stat().st_size)
    return None
