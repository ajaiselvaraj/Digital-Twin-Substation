"""
Simulation predictor utilities for digital-twin analysis.

This module implements a generic hybrid (XGBoost + LSTM) pipeline that can be
reused for all supported equipment types:

  - transformer
  - bayLines          (stored as powerFlowLines in Firestore assets)
  - circuitBreaker
  - isolator
  - busbar

Design goals:
  - Mirror the reference snippet you shared (single-row -> XGB -> LSTM).
  - Fetch asset/master information from Firestore (via fetch_firebase).
  - Merge asset details with simulation input-panel values.
  - Stay generic by relying on metadata_*.json (feature_cols & targets).
"""

from __future__ import annotations

import json
import os
import warnings
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf

# Suppress scikit-learn version mismatch warnings
try:
    from sklearn.base import InconsistentVersionWarning
except ImportError:
    # Fallback for older scikit-learn versions that don't have this warning
    InconsistentVersionWarning = type("InconsistentVersionWarning", (Warning,), {})

from fetch_firebase import fetch_asset_metadata


MODEL_ROOT = os.path.join(os.path.dirname(__file__), "model_files")


@dataclass(frozen=True)
class ModelArtifacts:
    model_name: str
    xgb_model: Any
    scaler_X: Any
    meta_scaler: Any
    ord_encoder: Any
    lstm_model: tf.keras.Model
    feature_cols: List[str]
    target_cols: List[str]
    seq_len: int


COMPONENT_MODEL_NAME: Dict[str, str] = {
    "transformer": "transformer",
    "bayLines": "bayline",
    "circuitBreaker": "circuitBreaker",
    "isolator": "isolator",
    "busbar": "busbar",
}

# Mapping from component key → Firestore assets collection key
COMPONENT_ASSET_KEY: Dict[str, str] = {
    "transformer": "transformers",
    "bayLines": "powerFlowLines",  # NOTE: bay line stored as powerFlowLines
    "circuitBreaker": "breakers",
    "isolator": "isolators",
    "busbar": "busbars",
}


def _load_metadata_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=None)
def load_artifacts(model_name: str) -> ModelArtifacts:
    """
    Lazily load all artifacts for a given model name.

    model_name is the short name used in filenames, e.g.:
        transformer, bayline, circuitBreaker, isolator, busbar
    """
    base_path = os.path.join(MODEL_ROOT, model_name)
    # Backward compatibility: models may be directly under MODEL_ROOT
    # Check if the subdirectory exists AND contains the required model file
    xgb_filename = f"xgb_model_{model_name}.joblib"
    if os.path.isdir(base_path) and os.path.isfile(os.path.join(base_path, xgb_filename)):
        # Files are in the subdirectory
        pass
    else:
        # Files are directly under MODEL_ROOT
        base_path = MODEL_ROOT

    def _p(filename: str) -> str:
        return os.path.join(base_path, filename)

    # Suppress scikit-learn version mismatch warnings when loading pickled models
    # This is safe as long as the model structure hasn't changed between versions
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
        xgb_model = joblib.load(_p(f"xgb_model_{model_name}.joblib"))
        scaler_X = joblib.load(_p(f"scaler_X_{model_name}.joblib"))
        meta_scaler = joblib.load(_p(f"meta_scaler_{model_name}.joblib"))
        ord_encoder = joblib.load(_p(f"ordinal_encoder_{model_name}.joblib"))
    
    lstm_model = tf.keras.models.load_model(_p(f"lstm_hybrid_{model_name}.keras"))
    metadata = _load_metadata_json(_p(f"metadata_{model_name}.json"))

    feature_cols: List[str] = metadata["feature_cols"]
    target_cols: List[str] = metadata["targets"]
    seq_len: int = metadata.get("used_seq_len", metadata.get("seq_len", 1))

    return ModelArtifacts(
        model_name=model_name,
        xgb_model=xgb_model,
        scaler_X=scaler_X,
        meta_scaler=meta_scaler,
        ord_encoder=ord_encoder,
        lstm_model=lstm_model,
        feature_cols=feature_cols,
        target_cols=target_cols,
        seq_len=seq_len,
    )


def _flatten_dict(prefix: str, obj: Any, out: Dict[str, Any]) -> None:
    """
    Very small helper to flatten nested dictionaries from Firestore into
    a single-level key → value mapping.

    We intentionally use only terminal (non-dict, non-list) values.
    """
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_prefix = f"{prefix}{k}" if not prefix else f"{prefix}_{k}"
            _flatten_dict(new_prefix, v, out)
    elif isinstance(obj, list):
        # We ignore lists for now – ML features are expected as scalar columns.
        return
    else:
        out[prefix] = obj


def _build_feature_row(
    component: str,
    artifacts: ModelArtifacts,
    asset_metadata: Dict[str, Any],
    panel_inputs: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Build a single flat row of features by combining:
      - master level metadata (e.g. installationYear, areaName, voltageClass)
      - first asset in the relevant assets collection (e.g. transformers[0])
      - raw panel input values from the simulation UI

    Precedence:
      1. panel_inputs
      2. asset-level fields
      3. master-level fields
    """
    master = asset_metadata.get("master") or {}
    assets = asset_metadata.get("assets") or {}

    asset_key = COMPONENT_ASSET_KEY.get(component)
    asset_obj: Dict[str, Any] = {}
    if asset_key and isinstance(assets.get(asset_key), list) and assets[asset_key]:
        # Use the first asset for now; UI selects a single asset in any case.
        asset_obj = assets[asset_key][0] or {}

    flat_master: Dict[str, Any] = {}
    flat_asset: Dict[str, Any] = {}

    _flatten_dict("", master, flat_master)
    _flatten_dict("", asset_obj, flat_asset)

    row: Dict[str, Any] = {}
    for col in artifacts.feature_cols:
        if col in panel_inputs:
            row[col] = panel_inputs[col]
        elif col in flat_asset:
            row[col] = flat_asset[col]
        elif col in flat_master:
            row[col] = flat_master[col]
        else:
            # leave as missing; will be imputed later
            row[col] = np.nan

    # It can be useful to pass age explicitly if the column exists.
    if "ageYears" in artifacts.feature_cols:
        install_year = None
        # Prefer asset installation year, otherwise master installationYear
        for key in ("installationYear", "installYear", "commissionedYear"):
            if key in flat_asset:
                install_year = flat_asset[key]
                break
        if install_year is None:
            install_year = flat_master.get("installationYear")
        try:
            install_year_num = float(install_year)
            age_years = max(0.0, float(pd.Timestamp.now().year) - install_year_num)
            row["ageYears"] = age_years
        except Exception:
            # fallback: leave what metadata already defined or NaN
            pass

    return row


def _preprocess_row(row: Dict[str, Any], artifacts: ModelArtifacts) -> np.ndarray:
    """
    Mirror of the reference preprocess_input() implementation but working
    on an already-constructed feature row.
    """
    df = pd.DataFrame([row])

    # Ensure all expected features exist
    for col in artifacts.feature_cols:
        if col not in df:
            df[col] = np.nan

    # Encode categorical / object columns with the saved ordinal encoder
    non_num = [c for c in artifacts.feature_cols if df[c].dtype == "object"]
    if non_num:
        df[non_num] = artifacts.ord_encoder.transform(df[non_num].astype(str))

    # Fill missing numerics with column medians, others with 0
    df = df.fillna(df.median(numeric_only=True)).fillna(0)

    # Scale features
    scaled = artifacts.scaler_X.transform(df[artifacts.feature_cols])
    return scaled


def _build_sequence(
    latest_inputs_scaled: np.ndarray,
    meta_pred: np.ndarray,
    artifacts: ModelArtifacts,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Build (seq_len, feature_dim) window for LSTM.
    For real-time/single-input mode we simply repeat the last reading.
    """
    feature_dim = latest_inputs_scaled.shape[1]
    seq_data = np.repeat(latest_inputs_scaled, artifacts.seq_len, axis=0)
    seq_data = seq_data.reshape(1, artifacts.seq_len, feature_dim)

    meta_scaled = artifacts.meta_scaler.transform(meta_pred.reshape(1, -1))
    return seq_data, meta_scaled


def predict_component_from_panel(
    component: str,
    substation_id: str,
    panel_inputs: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Public API.

    Parameters
    ----------
    component:
        One of: "transformer", "bayLines", "circuitBreaker", "isolator", "busbar".
    substation_id:
        Firestore document ID for the substation.
    panel_inputs:
        Raw input dictionary from the simulation panel UI. Keys should match
        the feature columns where possible (e.g. ambientTemperature,
        transformerLoading, oilTemperature, ctBurdenPercent, etc.).

    Returns
    -------
    Dictionary mapping target names to float values, e.g.:
        {
          "thermalHealth": 87.5,
          "oilHealth": 82.3,
          "trueHealth": 0.86,
          "rul_optimistic_months": 120.3,
          ...
        }
    """
    if component not in COMPONENT_MODEL_NAME:
        raise ValueError(f"Unsupported component for simulation predictor: {component}")

    model_name = COMPONENT_MODEL_NAME[component]
    artifacts = load_artifacts(model_name)

    # Try to enrich with live asset metadata when Firebase is configured.
    # If credentials / env vars are missing, fall back gracefully to
    # using only the panel inputs so that the HTTP API does not fail.
    try:
        asset_metadata = fetch_asset_metadata(substation_id)
    except Exception as exc:
        # This is safe to log to stderr – the Node.js caller surfaces the
        # message if needed, but we still return a valid prediction payload.
        print(
            json.dumps(
                {
                    "warning": "fetch_asset_metadata_failed",
                    "substation_id": substation_id,
                    "error": str(exc),
                }
            ),
            flush=True,
        )
        asset_metadata = {}

    feature_row = _build_feature_row(component, artifacts, asset_metadata, panel_inputs)
    X_scaled = _preprocess_row(feature_row, artifacts)

    # Tabular meta-model prediction
    meta_pred = artifacts.xgb_model.predict(X_scaled)

    # Sequence for LSTM
    X_seq, meta_seq = _build_sequence(X_scaled, meta_pred, artifacts)

    # Final LSTM hybrid prediction
    raw_pred = artifacts.lstm_model.predict([X_seq, meta_seq])[0]

    result: Dict[str, Any] = {
        artifacts.target_cols[i]: float(raw_pred[i]) for i in range(len(artifacts.target_cols))
    }

    # Normalize / mirror trueHealth vs overallHealth if present
    if "trueHealth" in result and "overallHealth" not in result:
        result["overallHealth"] = float(result["trueHealth"])
    if "overallHealth" in result and "trueHealth" not in result:
        result["trueHealth"] = float(result["overallHealth"])

    return result


def _cli() -> int:  # pragma: no cover - simple convenience wrapper
    """
    Lightweight CLI:

        python simulation_predictor.py \\
            --component transformer \\
            --substation MAD-728412 \\
            --inputs '{"ambientTemperature": 34, "transformerLoading": 76, ...}'
    """
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Simulation predictor CLI")
    parser.add_argument("--component", required=True, help="Component key")
    parser.add_argument("--substation", required=True, help="Substation document ID")
    parser.add_argument(
        "--inputs",
        required=True,
        help="JSON string with panel input values",
    )

    args = parser.parse_args()

    try:
        inputs = json.loads(args.inputs)
        if not isinstance(inputs, dict):
            raise ValueError("inputs JSON must be an object")
    except Exception as exc:  # pragma: no cover
        print(json.dumps({"error": f"Invalid inputs JSON: {exc}"}))
        return 1

    try:
        result = predict_component_from_panel(args.component, args.substation, inputs)
    except Exception as exc:  # pragma: no cover
        print(json.dumps({"error": str(exc), "component": args.component, "substation": args.substation}))
        return 1

    print(json.dumps(result))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(_cli())




