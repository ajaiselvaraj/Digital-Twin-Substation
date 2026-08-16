import os
import sys
import logging
from typing import Any, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Add inference directory to python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), "inference"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml-service")

app = FastAPI(
    title="Digital Twin Substation ML Service",
    description="Microservice for transformer, busbar, isolator, bayline, and circuit breaker predictions",
    version="1.0.0"
)

# Global dictionary to hold pre-loaded models
LOADED_MODELS = {}
LOADED_SIMULATION_ARTIFACTS = {}

# Import prediction helpers dynamically
try:
    import predict_models
    import simulation_predictor
except ImportError as e:
    logger.error(f"Failed to import prediction modules: {e}")

class SimulationRequest(BaseModel):
    component: str
    substation: str
    inputs: Dict[str, Any]

@app.on_event("startup")
def preload_models():
    """Attempt to preload all models on startup to minimize request latency."""
    logger.info("Initializing ML models pre-loading...")
    components = ["transformer", "isolator", "busbar", "bayline", "circuitBreaker"]
    
    # Pre-load diagnostic models
    for comp in components:
        try:
            logger.info(f"Preloading diagnostic models for: {comp}")
            # This calls the lru_cache function in predict_models
            models = predict_models.load_models(comp)
            LOADED_MODELS[comp] = models
            logger.info(f"Successfully preloaded diagnostic models for: {comp}")
        except Exception as e:
            logger.warning(
                f"Could not preload diagnostic models for {comp}. "
                f"Reason: {e}. Diagnostics for this component will use fallbacks."
            )
            
    # Pre-load simulation artifacts
    for comp in ["transformer", "bayline", "circuitBreaker", "isolator", "busbar"]:
        try:
            logger.info(f"Preloading simulation artifacts for: {comp}")
            artifacts = simulation_predictor.load_artifacts(comp)
            LOADED_SIMULATION_ARTIFACTS[comp] = artifacts
            logger.info(f"Successfully preloaded simulation artifacts for: {comp}")
        except Exception as e:
            logger.warning(
                f"Could not preload simulation artifacts for {comp}. "
                f"Reason: {e}. Simulations for this component will use fallbacks."
            )

@app.post("/predict/diagnosis/{component}")
def run_diagnosis(component: str, payload: Dict[str, Any]):
    """Run diagnostic prediction for a specific component using the provided JSON input data."""
    logger.info(f"Received diagnosis request for component: {component}")
    
    # Resolve component name mapping
    component_map = {
        "transformer": "predict_transformer",
        "baylines": "predict_bayline",
        "bayLines": "predict_bayline",
        "circuitbreaker": "predict_breaker",
        "circuitBreaker": "predict_breaker",
        "busbar": "predict_busbar",
        "isolator": "predict_isolator"
    }
    
    module_name = component_map.get(component)
    if not module_name:
        raise HTTPException(
            status_code=400, 
            detail=f"Component '{component}' is not supported or does not have a prediction module."
        )
        
    try:
        # Import module dynamically
        import importlib
        module = importlib.import_module(module_name)
        
        # Run predictor in input_data mode
        result = module.predict(input_data=payload)
        return result
    except ImportError:
        raise HTTPException(
            status_code=404,
            detail=f"Predictor module '{module_name}' is not found."
        )
    except Exception as e:
        logger.error(f"Prediction failed for {component}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Inference error during diagnosis: {str(e)}"
        )

@app.post("/predict/simulation")
def run_simulation(req: SimulationRequest):
    """Run hybrid XGBoost + LSTM what-if simulation prediction."""
    logger.info(f"Received simulation request for {req.component}, substation: {req.substation}")
    
    try:
        # Check if the module is available
        import simulation_predictor
        
        result = simulation_predictor.predict_component_from_panel(
            req.component,
            req.substation,
            req.inputs
        )
        return result
    except Exception as e:
        logger.error(f"Simulation prediction failed for {req.component}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Inference error during simulation: {str(e)}"
        )

@app.get("/health")
def health_check():
    """Health check endpoint to verify loaded models."""
    return {
        "status": "healthy",
        "diagnostic_models_loaded": list(LOADED_MODELS.keys()),
        "simulation_models_loaded": list(LOADED_SIMULATION_ARTIFACTS.keys())
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
