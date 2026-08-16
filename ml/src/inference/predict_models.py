"""Shared model loading and prediction utilities for all components."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict, Optional

import joblib
import numpy as np
import tensorflow as tf
from xgboost import XGBRegressor


MODEL_ROOT = os.path.join(os.path.dirname(__file__), "model_files")


@lru_cache(maxsize=10)
def load_models(component_name: str) -> Dict[str, Any]:
    """
    Load LSTM, XGBoost, and Isolation Forest models for a component.
    
    Args:
        component_name: Component name (e.g., "transformer", "isolator")
    
    Returns:
        Dictionary with 'lstm', 'xgb', and 'iso' models
    """
    # Map component names to model file prefixes and folder names
    model_config = {
        "transformer": {"prefix": "Transformer", "folder": "transformer"},
        "isolator": {"prefix": "Isolator", "folder": "isolator"},
        "busbar": {"prefix": "Busbar", "folder": "busbar"},
        "bayline": {"prefix": "BayLine", "folder": "baylines"},
        "bayLines": {"prefix": "BayLine", "folder": "baylines"},
        "circuitBreaker": {"prefix": "CircuitBreaker", "folder": "circuitbreaker"},
        "breaker": {"prefix": "CircuitBreaker", "folder": "circuitbreaker"},
    }
    
    config = model_config.get(component_name)
    if not config:
        # Default fallback
        config = {"prefix": component_name.capitalize(), "folder": component_name.lower()}
    
    prefix = config["prefix"]
    folder_name = config["folder"]
    model_dir = os.path.join(MODEL_ROOT, folder_name)
    
    # If component-specific folder doesn't exist, try root
    if not os.path.isdir(model_dir):
        model_dir = MODEL_ROOT
    
    models = {}
    
    # Load LSTM model
    lstm_path = os.path.join(model_dir, f"{prefix}_LSTM.h5")
    if os.path.exists(lstm_path):
        # Load with compile=False to avoid deserialization issues with metrics
        # We only need the model for inference, not training
        # This is necessary for compatibility between different Keras/TensorFlow versions
        import warnings
        import os as os_module
        
        # Suppress TensorFlow/Keras warnings during model loading
        os_module.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress INFO and WARNING messages
        
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore")
            try:
                # Try loading with compile=False first (works for most cases)
                models["lstm"] = tf.keras.models.load_model(lstm_path, compile=False)
            except (ValueError, TypeError) as e:
                # If that fails, the model might have been saved with incompatible metrics
                # Try to load by providing compatible metric/loss implementations
                try:
                    # Use custom_objects to provide compatible metric implementations
                    # These are the TensorFlow/Keras equivalents
                    custom_objects = {
                        'mse': tf.keras.losses.MeanSquaredError(),
                        'mean_squared_error': tf.keras.losses.MeanSquaredError(),
                        'mae': tf.keras.losses.MeanAbsoluteError(),
                        'mean_absolute_error': tf.keras.losses.MeanAbsoluteError(),
                        'MeanSquaredError': tf.keras.losses.MeanSquaredError(),
                        'MeanAbsoluteError': tf.keras.losses.MeanAbsoluteError(),
                    }
                    models["lstm"] = tf.keras.models.load_model(
                        lstm_path, 
                        compile=False,
                        custom_objects=custom_objects
                    )
                except Exception as e2:
                    raise ValueError(
                        f"Failed to load LSTM model from {lstm_path}. "
                        f"Error: {str(e)}. This is likely due to Keras version incompatibility. "
                        f"The model was saved with metrics that cannot be deserialized in the current Keras version. "
                        f"Solution: Re-save the model with compile=False, or use a compatible Keras version."
                    )
    else:
        raise FileNotFoundError(f"LSTM model not found: {lstm_path}")
    
    # Load XGBoost model
    xgb_path = os.path.join(model_dir, f"{prefix}_XGBoost.json")
    if os.path.exists(xgb_path):
        xgb_model = XGBRegressor()
        xgb_model.load_model(xgb_path)
        models["xgb"] = xgb_model
    else:
        raise FileNotFoundError(f"XGBoost model not found: {xgb_path}")
    
    # Load Isolation Forest model
    iso_path = os.path.join(model_dir, f"{prefix}_IsolationForest.pkl")
    if os.path.exists(iso_path):
        models["iso"] = joblib.load(iso_path)
    else:
        raise FileNotFoundError(f"Isolation Forest model not found: {iso_path}")
    
    return models


def calculate_asset_aging(installation_year: Optional[int], current_year: int = 2025) -> float:
    """Calculate asset aging factor (0-1)."""
    if installation_year is None:
        return 0.5  # Default aging
    aging = (current_year - installation_year) / 40.0
    return np.clip(aging, 0, 1)


def pick_fault_from_probability(component: str, probability: float) -> Dict[str, Optional[str]]:
    """Pick fault type based on probability."""
    from predict_shared import FAULT_LIBRARY
    
    if probability < 0.55:
        return {"predicted_fault": "Normal", "affected_subpart": None}
    
    library = FAULT_LIBRARY.get(component, [("Undefined Condition", None)])
    import random
    fault, subpart = random.choice(library)
    return {"predicted_fault": fault, "affected_subpart": subpart}


def generate_timeline_prediction(base_value: float = 70.0, hours: int = 24) -> list[float]:
    """Generate timeline prediction values."""
    import random
    values = []
    current = base_value
    for _ in range(hours):
        current = max(10, min(150, current + random.uniform(-5, 5)))
        values.append(round(current, 2))
    return values

