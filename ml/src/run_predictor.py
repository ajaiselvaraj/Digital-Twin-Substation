"""
CLI wrapper that dispatches to component-specific predictor modules.

Usage (legacy - fetches from Firebase):
    python run_predictor.py --component transformer --area CHN001 --substation CHN-482153

Usage (new - receives data from stdin):
    python run_predictor.py --component transformer --stdin < input.json

The script prints JSON to stdout so that Node/Next API routes can consume it.
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
import sys
from typing import Any, Dict

# Suppress TensorFlow/Keras verbose output to avoid corrupting JSON stdout
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress all TensorFlow output (ERROR only)
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN verbose output


COMPONENT_MODULES = {
    "bayLines": "predict_bayline",
    "transformer": "predict_transformer",
    "circuitBreaker": "predict_breaker",
    "busbar": "predict_busbar",
    "isolator": "predict_isolator",
    "relay": "predict_relay",
    "pmu": "predict_pmu",
    "gis": "predict_gis",
    "battery": "predict_battery",
    "environment": "predict_environment",
}


def _load_predictor(component: str):
    module_name = COMPONENT_MODULES.get(component)
    if not module_name:
        raise ValueError(f"Unsupported component '{component}'")
    module = importlib.import_module(module_name)
    if not hasattr(module, "predict"):
        raise AttributeError(f"Module {module_name} missing predict()")
    return module.predict


def main(argv: Any = None) -> int:
    parser = argparse.ArgumentParser(description="Diagnosis predictor dispatcher")
    parser.add_argument("--component", required=True, help="Component key, e.g. transformer")
    parser.add_argument("--area", help="Area code / realtime root key (legacy mode)")
    parser.add_argument("--substation", help="Substation ID (legacy mode)")
    parser.add_argument("--stdin", action="store_true", help="Read input data from stdin (JSON)")

    args = parser.parse_args(argv)

    predictor = _load_predictor(args.component)
    try:
        if args.stdin:
            # New mode: read JSON from stdin
            stdin_data = sys.stdin.read()
            if not stdin_data:
                raise ValueError("No data provided via stdin")
            input_data = json.loads(stdin_data)
            # Call predictor with input data
            result: Dict[str, Any] = predictor(input_data=input_data)
        else:
            # Legacy mode: fetch from Firebase
            if not args.area or not args.substation:
                raise ValueError("--area and --substation required when not using --stdin")
            result: Dict[str, Any] = predictor(area_code=args.area, substation_id=args.substation)
    except Exception as exc:  # pragma: no cover - used for human-readable errors
        print(json.dumps({"error": str(exc), "component": args.component}), file=sys.stderr)
        raise

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

