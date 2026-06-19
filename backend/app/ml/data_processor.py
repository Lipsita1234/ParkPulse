"""
ParkPulse AI — Module 1: Data Processing & Cleaning Engine
Handles auto-detection, loading, cleaning, and feature engineering.
"""
import re
import json
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional

warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────
# Column mapping: normalise to standard names
# ─────────────────────────────────────────────
COLUMN_ALIASES = {
    "latitude": ["latitude", "lat", "y", "geo_lat"],
    "longitude": ["longitude", "long", "lon", "x", "geo_lon"],
    "location": ["location", "area", "road", "locality", "address"],
    "vehicle_type": ["vehicle_type", "vehicle", "vehicletype", "updated_vehicle_type"],
    "violation": ["violation_type", "violation", "offence", "offense"],
    "offence_code": ["offence_code", "offense_code", "code"],
    "created_date": ["created_datetime", "created_date", "date", "timestamp"],
    "police_station": ["police_station", "station", "ps"],
    "junction": ["junction_name", "junction"],
    "validation_status": ["validation_status", "status"],
    "id": ["id"],
}

SEASON_MAP = {12: "Winter", 1: "Winter", 2: "Winter",
              3: "Spring", 4: "Spring", 5: "Spring",
              6: "Summer", 7: "Summer", 8: "Summer",
              9: "Autumn", 10: "Autumn", 11: "Autumn"}


class DataProcessor:
    def __init__(self, dataset_path: Path):
        self.dataset_path = dataset_path
        self.raw_df: Optional[pd.DataFrame] = None
        self.df: Optional[pd.DataFrame] = None
        self.quality_report: dict = {}

    # ─────────────────────────────────────────
    # Load
    # ─────────────────────────────────────────
    def load(self) -> "DataProcessor":
        path = str(self.dataset_path)
        if path.endswith((".csv", ".csv.gz", ".zip")):
            self.raw_df = pd.read_csv(path, low_memory=False)
        else:
            self.raw_df = pd.read_excel(path)
        self.quality_report["total_records"] = len(self.raw_df)
        return self

    # ─────────────────────────────────────────
    # Schema detection & standardisation
    # ─────────────────────────────────────────
    def _detect_columns(self, df: pd.DataFrame) -> dict[str, str]:
        """Return mapping: standard_name -> actual_col_name"""
        lower_cols = {c.lower().strip(): c for c in df.columns}
        mapping = {}
        for std_name, aliases in COLUMN_ALIASES.items():
            for alias in aliases:
                if alias.lower() in lower_cols:
                    mapping[std_name] = lower_cols[alias.lower()]
                    break
        return mapping

    def _standardise_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        col_map = self._detect_columns(df)
        rename = {v: k for k, v in col_map.items()}
        df = df.rename(columns=rename)
        return df

    # ─────────────────────────────────────────
    # Clean
    # ─────────────────────────────────────────
    def clean(self) -> "DataProcessor":
        df = self.raw_df.copy()

        # Standardise column names
        df = self._standardise_columns(df)

        # ── Duplicates ──
        before = len(df)
        df = df.drop_duplicates()
        self.quality_report["duplicates_removed"] = before - len(df)

        # ── Parse dates ──
        if "created_date" in df.columns:
            df["created_date"] = pd.to_datetime(df["created_date"], utc=True, errors="coerce")
            df["created_date"] = df["created_date"].dt.tz_convert("Asia/Kolkata").dt.tz_localize(None)

        # ── Validate coordinates ──
        if "latitude" in df.columns and "longitude" in df.columns:
            df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
            df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
            valid_coords = (
                df["latitude"].between(6, 37) &
                df["longitude"].between(68, 98)
            )
            df = df[valid_coords]

        # ── Filter approved records ──
        if "validation_status" in df.columns:
            df = df[df["validation_status"].str.lower() == "approved"]

        # ── Drop rows with missing location ──
        if "location" in df.columns:
            missing_loc = df["location"].isna().sum()
            self.quality_report["missing_location_removed"] = int(missing_loc)
            df = df.dropna(subset=["location"])

        # ── Missing values: fill with mode/median ──
        missing_before = df.isnull().sum().sum()
        for col in ["police_station", "junction", "vehicle_type"]:
            if col in df.columns:
                mode_val = df[col].mode()
                df[col] = df[col].fillna(mode_val[0] if len(mode_val) else "Unknown")
        self.quality_report["missing_values_handled"] = int(missing_before - df.isnull().sum().sum())

        # ── Parse violation as list ──
        if "violation" in df.columns:
            def parse_violation(v):
                if pd.isna(v):
                    return "UNKNOWN"
                try:
                    lst = json.loads(v)
                    return ", ".join(lst) if isinstance(lst, list) else str(v)
                except Exception:
                    return str(v).strip('[]"\'')
            df["violation"] = df["violation"].apply(parse_violation)

        # ── Clean location: keep first part ──
        if "location" in df.columns:
            df["location_short"] = df["location"].apply(
                lambda x: str(x).split(",")[0].strip() if pd.notna(x) else "Unknown"
            )

        df = df.reset_index(drop=True)
        self.quality_report["usable_records"] = len(df)
        self.df = df
        return self

    # ─────────────────────────────────────────
    # Feature Engineering
    # ─────────────────────────────────────────
    def engineer_features(self) -> "DataProcessor":
        df = self.df.copy()

        # ── Time features ──
        if "created_date" in df.columns:
            df["hour"] = df["created_date"].dt.hour
            df["day_of_week"] = df["created_date"].dt.dayofweek   # 0=Mon
            df["day_name"] = df["created_date"].dt.day_name()
            df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
            df["month"] = df["created_date"].dt.month
            df["month_name"] = df["created_date"].dt.strftime("%b")
            df["year"] = df["created_date"].dt.year
            df["season"] = df["month"].map(SEASON_MAP)
            df["is_peak_hour"] = df["hour"].apply(
                lambda h: 1 if (7 <= h <= 10 or 17 <= h <= 21) else 0
            )

        # ── Historical frequency features (kept for risk engine & analytics) ──
        if "location" in df.columns:
            loc_freq = df["location"].value_counts()
            df["location_freq"] = df["location"].map(loc_freq)

        if "vehicle_type" in df.columns:
            veh_freq = df["vehicle_type"].value_counts()
            df["vehicle_freq"] = df["vehicle_type"].map(veh_freq)

        if "police_station" in df.columns:
            ps_freq = df["police_station"].value_counts()
            df["station_workload"] = df["police_station"].map(ps_freq)

        if "junction" in df.columns:
            jn_freq = df["junction"].value_counts()
            df["junction_freq"] = df["junction"].map(jn_freq)

        if "is_peak_hour" in df.columns and "location" in df.columns:
            peak_rate = df.groupby("location")["is_peak_hour"].mean()
            df["peak_hour_rate"] = df["location"].map(peak_rate)

        # ── NEW: Non-leaked temporal aggregate features for ML ──
        # Cyclical encoding of hour, month, and day-of-week
        if "hour" in df.columns:
            df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
            df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

        if "month" in df.columns:
            df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
            df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

        if "day_of_week" in df.columns:
            df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
            df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)

        # Global violations per hour bin (not per-location — city-wide temporal pattern)
        if "hour" in df.columns:
            hour_counts = df.groupby("hour").size()
            total = len(df)
            df["hour_violation_rate"] = df["hour"].map(hour_counts) / total

        # Day-of-week violation density (global pattern)
        if "day_of_week" in df.columns:
            dow_counts = df.groupby("day_of_week").size()
            df["dow_violation_rate"] = df["day_of_week"].map(dow_counts) / len(df)

        # ── Spatial grid/zone features ──
        if "latitude" in df.columns and "longitude" in df.columns:
            df["grid_id"] = df["latitude"].round(2).astype(str) + "_" + df["longitude"].round(2).astype(str)

        # ── Location rolling & cumulative features (past-only) ──
        if "location" in df.columns and "created_date" in df.columns:
            # Sort by location and date, reset index
            df = df.sort_values(by=["location", "created_date"]).reset_index(drop=True)
            df_temp = df.copy()
            df_temp.index = df_temp["created_date"]
            
            df["location_roll_1d"] = df_temp.groupby("location")["location"].rolling("1D", closed="left", min_periods=0).count().values
            df["location_roll_7d"] = df_temp.groupby("location")["location"].rolling("7D", closed="left", min_periods=0).count().values
            df["location_roll_30d"] = df_temp.groupby("location")["location"].rolling("30D", closed="left", min_periods=0).count().values
            df["location_historical_count"] = df.groupby("location").cumcount()
            df["location_hour_historical_count"] = df.groupby(["location", "hour"]).cumcount()
            df["location_dow_historical_count"] = df.groupby(["location", "day_of_week"]).cumcount()

        # ── Grid rolling & cumulative features (past-only) ──
        if "grid_id" in df.columns and "created_date" in df.columns:
            # Sort by grid_id and date, reset index
            df = df.sort_values(by=["grid_id", "created_date"]).reset_index(drop=True)
            df_temp = df.copy()
            df_temp.index = df_temp["created_date"]
            
            df["grid_roll_1d"] = df_temp.groupby("grid_id")["grid_id"].rolling("1D", closed="left", min_periods=0).count().values
            df["grid_roll_7d"] = df_temp.groupby("grid_id")["grid_id"].rolling("7D", closed="left", min_periods=0).count().values
            df["grid_roll_30d"] = df_temp.groupby("grid_id")["grid_id"].rolling("30D", closed="left", min_periods=0).count().values
            df["grid_historical_count"] = df.groupby("grid_id").cumcount()

        # Resort chronologically to preserve temporal order
        if "created_date" in df.columns:
            df = df.sort_values(by="created_date").reset_index(drop=True)

        self.df = df
        self.quality_report["features_engineered"] = [
            "hour", "day_of_week", "is_weekend", "month", "season",
            "location_freq", "vehicle_freq", "station_workload",
            "junction_freq", "peak_hour_rate",
            "hour_sin", "hour_cos", "month_sin", "month_cos", "dow_sin", "dow_cos",
            "hour_violation_rate", "dow_violation_rate", "grid_id",
            "location_roll_1d", "location_roll_7d", "location_roll_30d",
            "location_historical_count", "location_hour_historical_count", "location_dow_historical_count",
            "grid_roll_1d", "grid_roll_7d", "grid_roll_30d", "grid_historical_count",
        ]
        return self

    # ─────────────────────────────────────────
    # Quality Report
    # ─────────────────────────────────────────
    def get_quality_report(self) -> dict:
        report = dict(self.quality_report)
        df = self.df
        if df is not None:
            report["column_list"] = df.columns.tolist()
            report["dtype_summary"] = {col: str(dt) for col, dt in df.dtypes.items()}
            if "vehicle_type" in df.columns:
                report["vehicle_distribution"] = df["vehicle_type"].value_counts().head(10).to_dict()
            if "violation" in df.columns:
                report["violation_distribution"] = df["violation"].value_counts().head(10).to_dict()
            if "police_station" in df.columns:
                report["station_distribution"] = df["police_station"].value_counts().head(10).to_dict()
        return report

    def run(self) -> "DataProcessor":
        return self.load().clean().engineer_features()


# ── Singleton cache ──────────────────────────
_processor_instance: Optional[DataProcessor] = None


def get_processor() -> Optional[DataProcessor]:
    return _processor_instance


def init_processor(dataset_path: Path) -> DataProcessor:
    global _processor_instance
    print(f"[DataProcessor] Loading dataset: {dataset_path}")
    proc = DataProcessor(dataset_path)
    proc.run()
    print(f"[DataProcessor] Ready - {len(proc.df)} usable records")
    _processor_instance = proc
    return proc
