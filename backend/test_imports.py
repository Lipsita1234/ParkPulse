"""Quick backend test — verify imports and config."""
import sys
sys.path.insert(0, ".")

print("Testing backend imports...")
from app.core.config import find_dataset, MODEL_DIR
print(f"  OK Config loaded — Model dir: {MODEL_DIR}")

ds = find_dataset()
print(f"  OK Dataset found: {ds}")

from app.ml.data_processor import DataProcessor
print("  OK DataProcessor imported")

from app.ml.hotspot_engine import run_dbscan, compute_hotspots
print("  OK HotspotEngine imported")

from app.ml.risk_engine import compute_risk_scores
print("  OK RiskEngine imported")

from app.ml.ml_engine import train_models, load_saved_model
print("  OK MLEngine imported")

from app.ml.shap_engine import init_shap
print("  OK SHAPEngine imported")

print("\nAll imports OK OK")
