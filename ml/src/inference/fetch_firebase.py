"""
Helpers to read live and asset metadata from Firebase services.

The module tries to initialise firebase_admin using either:
1. FIREBASE_SERVICE_ACCOUNT_PATH -> path to service account json
2. FIREBASE_SERVICE_ACCOUNT -> json string of the credentials

The Realtime Database URL is read from FIREBASE_DATABASE_URL.
If credentials/envs are missing, the module raises RuntimeError so that
callers can decide to fallback to synthetic data.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any, Dict

import firebase_admin
from firebase_admin import credentials, db, firestore


def _load_credentials() -> credentials.Certificate:
    key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    key_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")

    if key_path and os.path.exists(key_path):
        return credentials.Certificate(key_path)

    if key_json:
        payload = json.loads(key_json)
        return credentials.Certificate(payload)

    raise RuntimeError(
        "Firebase service account not configured. "
        "Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT."
    )


@lru_cache(maxsize=1)
def _get_app() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred = _load_credentials()
    options = {}
    db_url = os.getenv("FIREBASE_DATABASE_URL")
    if db_url:
        options["databaseURL"] = db_url

    return firebase_admin.initialize_app(cred, options or None)


@lru_cache(maxsize=1)
def _firestore_client() -> firestore.Client:
    app = _get_app()
    return firestore.client(app=app)


@lru_cache(maxsize=1)
def _realtime_client() -> db.Reference:
    app = _get_app()
    return db.reference("/", app=app)


def fetch_realtime(area_code: str, substation_id: str) -> Dict[str, Any]:
    ref = _realtime_client()
    snapshot = ref.child(area_code).child(substation_id).get()
    return snapshot or {}


def fetch_asset_metadata(substation_id: str) -> Dict[str, Any]:
    store = _firestore_client()
    doc = store.collection("substations").document(substation_id).get()
    return doc.to_dict() or {}

