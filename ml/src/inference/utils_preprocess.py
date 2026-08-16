"""Utility helpers for diagnosis predictors."""

from __future__ import annotations

from typing import Any, Dict


def merge_inputs(live: Dict[str, Any], asset: Dict[str, Any]) -> Dict[str, Any]:
    assets = asset.get("assets", {}) if isinstance(asset, dict) else {}
    master = asset.get("master", {}) if isinstance(asset, dict) else {}

    merged = {
        "live": live or {},
        "asset_info": assets,
        "condition": asset.get("conditionAssessment", {}),
        "maintenanceHistory": asset.get("maintenanceHistory", []),
        "operationHistory": asset.get("operationHistory", []),
        "installationYear": master.get("installationYear"),
        "metadata": master,
    }

    return merged

