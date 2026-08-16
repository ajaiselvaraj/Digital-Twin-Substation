"""Shared helpers for placeholder ML predictions."""

from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


FAULT_LIBRARY = {
    "bayLines": [
        ("Power Swing / Stability Risk", "Line section A"),
        ("Voltage Sag", "PT circuit"),
        ("Current Unbalance", "CT core"),
    ],
    "transformer": [
        ("Winding Hotspot", "HV winding"),
        ("Oil Degradation", "Main tank"),
        ("Tap Changer Wear", "OLTC compartment"),
    ],
    "circuitBreaker": [
        ("Slow Operating Mechanism", "Spring drive"),
        ("SF6 Leak", "Tank"),
        ("Contact Wear", "Arcing contact"),
    ],
    "busbar": [
        ("Thermal Hotspot", "Section-2"),
        ("Shield Connection Loose", "Spacer clamp"),
        ("Overload Risk", "Phase B"),
    ],
    "isolator": [
        ("Drive Torque Drop", "Drive shaft"),
        ("Contact Resistance Rise", "Jaw contact"),
        ("Motor Stall", "Motor unit"),
    ],
    "relay": [
        ("Firmware Fault", "CPU board"),
        ("Incorrect Settings", "Zone-2 reach"),
    ],
    "pmu": [
        ("GPS Unlock", "Time sync module"),
        ("Phasor Drift", "ADC board"),
    ],
    "gis": [
        ("Partial Discharge", "Compartment C1"),
        ("SF6 Moisture Rise", "Compartment C3"),
    ],
    "battery": [
        ("Cell Imbalance", "String-1"),
        ("Float Voltage Drop", "Charger unit"),
    ],
    "environment": [
        ("Thermal Stress", "Ambient"),
        ("Humidity Spike", "Control room"),
    ],
}


def _pick_fault(component: str, probability: float) -> Dict[str, Optional[str]]:
    library = FAULT_LIBRARY.get(component, [("Undefined Condition", None)])
    fault, subpart = random.choice(library)
    if probability < 0.55:
        return {"predicted_fault": "Normal", "affected_subpart": None}
    return {"predicted_fault": fault, "affected_subpart": subpart}


def _timeline() -> List[float]:
    base = random.uniform(40, 110)
    values = []
    for _ in range(24):
        base = max(10, min(150, base + random.uniform(-5, 5)))
        values.append(round(base, 2))
    return values


def build_placeholder_response(component: str, live: Dict[str, Any], asset: Dict[str, Any]) -> Dict[str, Any]:
    fault_prob = round(random.uniform(0.05, 0.95), 2)
    health = round(100 - fault_prob * 70 + random.uniform(-4, 4), 2)
    selection = _pick_fault(component, fault_prob)

    explanation = (
        "Heuristic blend of live drift, maintenance backlog, and temperature gradients."
        if fault_prob > 0.7
        else "Operating envelope remains inside learned band. Monitoring continues."
    )

    return {
        "component": component,
        "fault_probability": fault_prob,
        "health_index": max(0, min(100, health)),
        **selection,
        "explanation": explanation,
        "timeline_prediction": _timeline(),
        "live_readings": live,
        "asset_metadata": asset,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }

