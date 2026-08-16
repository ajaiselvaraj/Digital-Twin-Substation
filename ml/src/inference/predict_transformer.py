"""Transformer prediction using LSTM, XGBoost, and Isolation Forest models."""

from __future__ import annotations

import os
# Suppress TensorFlow/Keras verbose output before importing
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress all TensorFlow output
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN verbose output

import numpy as np
from datetime import datetime, timezone
from typing import Any, Dict

from fetch_firebase import fetch_asset_metadata, fetch_realtime
from predict_models import load_models, pick_fault_from_probability, generate_timeline_prediction
from utils_preprocess import merge_inputs

COMPONENT_KEY = "transformer"
CURRENT_YEAR = 2025


def predict(area_code: str = None, substation_id: str = None, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Predict transformer health using ML models.
    
    Args:
        area_code: Area code for realtime data (legacy mode)
        substation_id: Substation ID for asset metadata (legacy mode)
        input_data: Pre-processed input data dictionary (new mode)
    
    Returns:
        Prediction results dictionary
    """
    if input_data:
        # New mode: use provided input data directly (matching example pattern)
        # Copy input_data to data for processing
        data = input_data.copy()
        # Ensure installationYear is present
        if "installationYear" not in data:
            data["installationYear"] = input_data.get("installationYear", 2010)
        installation_year = data["installationYear"]
    else:
        # Legacy mode: fetch from Firebase
        if not area_code or not substation_id:
            raise ValueError("Either input_data or both area_code and substation_id must be provided")
        live_root = fetch_realtime(area_code, substation_id)
        live = (live_root or {}).get("transformer", {})
        asset = fetch_asset_metadata(substation_id)
        
        merged = merge_inputs(live, asset)
        live_data = merged["live"]
        asset_info = merged.get("asset_info", {})
        installation_year = merged.get("installationYear") or asset_info.get("installationYear")
    
    # Load models
    models = load_models("transformer")
    lstm_model = models["lstm"]
    iso_model = models["iso"]
    xgb_model = models["xgb"]
    
    # Extract live readings with defaults (only for legacy mode)
    if not input_data:
        # Legacy mode: map from live_data
        data = {
            "live_OilTemperature_C": live_data.get("oilTemp", live_data.get("live_OilTemperature_C", 60.0)),
            "live_WindingTemperature_C": live_data.get("windingTemp", live_data.get("live_WindingTemperature_C", 75.0)),
            "live_LoadingPercent": live_data.get("loading", live_data.get("live_LoadingPercent", 80.0)),
            "live_Hydrogen_ppm": live_data.get("hydrogen", live_data.get("live_Hydrogen_ppm", 50.0)),
            "live_Acetylene_ppm": live_data.get("acetylene", live_data.get("live_Acetylene_ppm", 0.5)),
            "live_Moisture_ppm": live_data.get("moisture", live_data.get("live_Moisture_ppm", 18.0)),
            "live_OilLevelPercent": live_data.get("oilLevel", live_data.get("live_OilLevelPercent", 95.0)),
            "live_TapPosition": live_data.get("tapPosition", live_data.get("live_TapPosition", 9)),
            "installationYear": installation_year or 2010,
        }
    
    # STEP 1: FEATURE PREPROCESSING
    # Normalize values like training (matching example pattern exactly)
    oil_temp_norm = data["live_OilTemperature_C"] / 100
    wind_temp_norm = data["live_WindingTemperature_C"] / 120
    loading_norm = data["live_LoadingPercent"] / 150
    h2_norm = data["live_Hydrogen_ppm"] / 300
    c2h2_norm = data["live_Acetylene_ppm"] / 50
    moist_norm = data["live_Moisture_ppm"] / 30
    level_norm = data["live_OilLevelPercent"] / 100
    tap_norm = data["live_TapPosition"] / 17
    
    # Aging (0–1) - matching example calculation exactly
    asset_aging = (CURRENT_YEAR - data["installationYear"]) / 40
    asset_aging = np.clip(asset_aging, 0, 1)
    
    # Environmental stress
    env_stress = (
        0.25 * oil_temp_norm +
        0.25 * wind_temp_norm +
        0.25 * loading_norm +
        0.25 * moist_norm
    )
    env_stress = np.clip(env_stress, 0, 1)
    
    # STEP 2: ISOLATION FOREST PREDICTION
    iso_features = np.array([[
        data["live_OilTemperature_C"],
        data["live_WindingTemperature_C"],
        data["live_LoadingPercent"],
        data["live_Hydrogen_ppm"],
        data["live_Acetylene_ppm"],
        data["live_Moisture_ppm"],
        data["live_OilLevelPercent"],
        data["live_TapPosition"]
    ]])
    iso_score = iso_model.predict(iso_features)[0]
    iso_score = 0 if iso_score == 1 else 1  # convert {1, -1} → {0, 1}
    
    # STEP 3: LSTM FORECAST SCORE
    # NOTE: For real use, pass last 20 readings. Here, using same value repeated.
    seq = np.array([[data["live_OilTemperature_C"]] * 20]).reshape(1, 20, 1)
    # Use verbose=0 to suppress progress output
    lstm_forecast = float(lstm_model.predict(seq, verbose=0)[0][0])
    
    # STEP 4: XGBOOST FAULT SCORE
    # Normalize installationYear for XGBoost (model expects 11 features)
    installation_year_norm = (data["installationYear"] - 1990) / (2025 - 1990)  # Normalize to 0-1 range
    installation_year_norm = np.clip(installation_year_norm, 0, 1)
    
    xgb_input = np.array([[
        data["live_OilTemperature_C"],
        data["live_WindingTemperature_C"],
        data["live_LoadingPercent"],
        data["live_Hydrogen_ppm"],
        data["live_Acetylene_ppm"],
        data["live_Moisture_ppm"],
        data["live_OilLevelPercent"],
        data["live_TapPosition"],
        asset_aging,
        env_stress,
        installation_year_norm  # 11th feature: normalized installation year
    ]])
    xgb_fault_score = float(xgb_model.predict(xgb_input)[0])
    
    # STEP 5: FAULT PROBABILITY
    fault_prob = float(
        0.30 * oil_temp_norm +
        0.25 * wind_temp_norm +
        0.20 * loading_norm +
        0.15 * moist_norm +
        0.10 * asset_aging
    )
    fault_prob = np.clip(fault_prob, 0, 1)
    
    # STEP 6: COMBINED FAULT PROBABILITY
    combined_fault = float(
        0.50 * fault_prob +
        0.30 * env_stress +
        0.20 * asset_aging
    )
    combined_fault = np.clip(combined_fault, 0, 1)
    
    # STEP 7: Health Index
    health_index = float(
        100
        - 20 * oil_temp_norm
        - 20 * wind_temp_norm
        - 20 * loading_norm
        - 20 * moist_norm
        - 20 * asset_aging
    )
    health_index = np.clip(health_index, 0, 100)
    
    # STEP 8: TOP 3 IMPACT FACTORS
    impact_factors = {
        "OilTemperature": 20 * oil_temp_norm,
        "WindingTemperature": 20 * wind_temp_norm,
        "LoadingPercent": 20 * loading_norm,
        "Moisture": 20 * moist_norm,
        "Aging": 20 * asset_aging
    }
    top3 = sorted(impact_factors.items(), key=lambda x: x[1], reverse=True)[:3]
    top3_factors = [f[0] for f in top3]
    
    # Pick fault based on probability
    fault_info = pick_fault_from_probability(COMPONENT_KEY, fault_prob)
    
    # Generate explanation
    if fault_prob > 0.7:
        explanation = (
            f"High fault probability detected. Primary concerns: {', '.join(top3_factors[:2])}. "
            f"LSTM forecast: {lstm_forecast:.2f}°C, Isolation Forest anomaly: {iso_score}, "
            f"XGBoost fault score: {xgb_fault_score:.2f}."
        )
    else:
        explanation = (
            f"Operating within normal parameters. Health index: {health_index:.1f}%. "
            f"Top impact factors: {', '.join(top3_factors)}."
        )
    
    # Generate timeline prediction
    timeline_prediction = generate_timeline_prediction(lstm_forecast, 24)
    
    # Prepare return data
    result = {
        "component": COMPONENT_KEY,
        "fault_probability": round(combined_fault, 3),
        "health_index": round(health_index, 2),
        **fault_info,
        "explanation": explanation,
        "timeline_prediction": timeline_prediction,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        # Additional model outputs (matching example format)
        "LSTM_ForecastScore": round(lstm_forecast, 2),
        "IsolationForestScore": int(iso_score),
        "XGBoost_FaultScore": round(xgb_fault_score, 3),
        "Top3_HealthImpactFactors": top3_factors,
    }
    
    # Add live_readings and asset_metadata based on mode
    if input_data:
        result["live_readings"] = input_data
        result["asset_metadata"] = {}
    else:
        result["live_readings"] = live_data
        result["asset_metadata"] = asset if 'asset' in locals() else {}
    
    return result
