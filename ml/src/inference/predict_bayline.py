"""Bay Line prediction using LSTM, XGBoost, and Isolation Forest models."""

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

COMPONENT_KEY = "bayLines"
CURRENT_YEAR = 2025


def predict(area_code: str = None, substation_id: str = None, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Predict bay line health using ML models.
    
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
            data["installationYear"] = input_data.get("installationYear", 2012)
        installation_year = data["installationYear"]
    else:
        # Legacy mode: fetch from Firebase
        if not area_code or not substation_id:
            raise ValueError("Either input_data or both area_code and substation_id must be provided")
        live_root = fetch_realtime(area_code, substation_id)
        live = (live_root or {}).get("bayLines", {})
        asset = fetch_asset_metadata(substation_id)
        
        merged = merge_inputs(live, asset)
        live_data = merged["live"]
        asset_info = merged.get("asset_info", {})
        installation_year = merged.get("installationYear") or asset_info.get("installationYear")
    
    # Load models
    models = load_models("bayline")
    lstm_model = models["lstm"]
    iso_model = models["iso"]
    xgb_model = models["xgb"]
    
    # Extract live readings with defaults (only for legacy mode)
    if not input_data:
        # Legacy mode: Handle both camelCase and snake_case field names
        data = {
            "live_BusVoltage_kV": live_data.get("busVoltage", live_data.get("live_BusVoltage_kV", 398.0)),
            "live_LineCurrent_A": live_data.get("lineCurrent", live_data.get("live_LineCurrent_A", 1780.0)),
            "live_ActivePower_MW": live_data.get("mw", live_data.get("live_ActivePower_MW", 640.0)),
            "live_ReactivePower_MVAR": live_data.get("mvar", live_data.get("live_ReactivePower_MVAR", 40.0)),
            "live_PowerFactor": live_data.get("powerFactor", live_data.get("live_PowerFactor", 0.94)),
            "live_Frequency_Hz": live_data.get("frequency", live_data.get("live_Frequency_Hz", 50.02)),
            "live_THD_percent": live_data.get("thd", live_data.get("live_THD_percent", 2.6)),
            "installationYear": installation_year or 2012,
        }
    
    # STEP 1: FEATURE PREPROCESSING
    # Normalize values like training (matching example pattern exactly)
    voltage_norm = (data["live_BusVoltage_kV"] - 380) / (420 - 380)  # Normalize to 0-1 range
    current_norm = data["live_LineCurrent_A"] / 3000  # Max expected ~3000 A
    power_norm = data["live_ActivePower_MW"] / 1500  # Max expected ~1500 MW
    reactive_norm = abs(data["live_ReactivePower_MVAR"]) / 500  # Max expected ~500 MVAR
    pf_norm = (1 - data["live_PowerFactor"]) / 0.5  # Lower PF = higher stress
    freq_norm = abs(data["live_Frequency_Hz"] - 50) / 0.5  # Deviation from 50 Hz
    thd_norm = data["live_THD_percent"] / 8  # Max expected ~8%
    
    # Clip normalized values
    voltage_norm = np.clip(voltage_norm, 0, 1)
    current_norm = np.clip(current_norm, 0, 1)
    power_norm = np.clip(power_norm, 0, 1)
    reactive_norm = np.clip(reactive_norm, 0, 1)
    pf_norm = np.clip(pf_norm, 0, 1)
    freq_norm = np.clip(freq_norm, 0, 1)
    thd_norm = np.clip(thd_norm, 0, 1)
    
    # Aging (0–1) - matching example calculation exactly
    asset_aging = (CURRENT_YEAR - data["installationYear"]) / 40
    asset_aging = np.clip(asset_aging, 0, 1)
    
    # Power quality stress
    pq_stress = (
        0.25 * current_norm +
        0.20 * power_norm +
        0.20 * pf_norm +
        0.15 * freq_norm +
        0.10 * thd_norm +
        0.10 * (1 - voltage_norm)
    )
    pq_stress = np.clip(pq_stress, 0, 1)
    
    # STEP 2: ISOLATION FOREST PREDICTION
    iso_features = np.array([[
        data["live_BusVoltage_kV"],
        data["live_LineCurrent_A"],
        data["live_ActivePower_MW"],
        data["live_ReactivePower_MVAR"],
        data["live_PowerFactor"],
        data["live_Frequency_Hz"],
        data["live_THD_percent"]
    ]])
    iso_score = iso_model.predict(iso_features)[0]
    iso_score = 0 if iso_score == 1 else 1  # convert {1, -1} → {0, 1}
    
    # STEP 3: LSTM FORECAST SCORE
    # Using active power as primary sequence input
    # NOTE: For real use, pass last 20 readings. Here, using same value repeated.
    seq = np.array([[data["live_ActivePower_MW"]] * 20]).reshape(1, 20, 1)
    # Use verbose=0 to suppress progress output
    lstm_forecast = float(lstm_model.predict(seq, verbose=0)[0][0])
    
    # STEP 4: XGBOOST FAULT SCORE
    xgb_input = np.array([[
        data["live_BusVoltage_kV"],
        data["live_LineCurrent_A"],
        data["live_ActivePower_MW"],
        data["live_ReactivePower_MVAR"],
        data["live_PowerFactor"],
        data["live_Frequency_Hz"],
        data["live_THD_percent"],
        asset_aging,
        pq_stress
    ]])
    xgb_fault_score = float(xgb_model.predict(xgb_input)[0])
    
    # STEP 5: FAULT PROBABILITY
    fault_prob = float(
        0.20 * current_norm +
        0.20 * power_norm +
        0.15 * pf_norm +
        0.15 * freq_norm +
        0.15 * thd_norm +
        0.10 * (1 - voltage_norm) +
        0.05 * asset_aging
    )
    fault_prob = np.clip(fault_prob, 0, 1)
    
    # STEP 6: COMBINED FAULT PROBABILITY
    combined_fault = float(
        0.50 * fault_prob +
        0.30 * pq_stress +
        0.20 * asset_aging
    )
    combined_fault = np.clip(combined_fault, 0, 1)
    
    # STEP 7: Health Index
    health_index = float(
        100
        - 20 * current_norm
        - 20 * power_norm
        - 15 * pf_norm
        - 15 * freq_norm
        - 15 * thd_norm
        - 10 * (1 - voltage_norm)
        - 5 * asset_aging
    )
    health_index = np.clip(health_index, 0, 100)
    
    # STEP 8: TOP 3 IMPACT FACTORS
    impact_factors = {
        "LineCurrent": 20 * current_norm,
        "ActivePower": 20 * power_norm,
        "PowerFactor": 15 * pf_norm,
        "Frequency": 15 * freq_norm,
        "THD": 15 * thd_norm,
        "BusVoltage": 10 * (1 - voltage_norm),
        "Aging": 5 * asset_aging
    }
    top3 = sorted(impact_factors.items(), key=lambda x: x[1], reverse=True)[:3]
    top3_factors = [f[0] for f in top3]
    
    # Pick fault based on probability
    fault_info = pick_fault_from_probability(COMPONENT_KEY, fault_prob)
    
    # Generate explanation
    if fault_prob > 0.7:
        explanation = (
            f"High fault probability detected. Primary concerns: {', '.join(top3_factors[:2])}. "
            f"LSTM forecast: {lstm_forecast:.2f} MW, Isolation Forest anomaly: {iso_score}, "
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
