import { readFileSync } from "node:fs"

import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getDatabase, type Database } from "firebase-admin/database"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let adminApp: App | null = null
let firestoreInstance: Firestore | null = null
let realtimeInstance: Database | null = null

function loadCredential() {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (path) {
    const contents = readFileSync(path, "utf8")
    return cert(JSON.parse(contents))
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  }

  return null
}

export function getFirebaseAdminApp() {
  if (adminApp) return adminApp
  if (getApps().length > 0) {
    adminApp = getApps()[0]!
    return adminApp
  }

  const credential = loadCredential()
  if (!credential) {
    return null
  }

  adminApp = initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  })
  return adminApp
}

export function getAdminFirestore() {
  if (firestoreInstance) return firestoreInstance
  const app = getFirebaseAdminApp()
  if (!app) return null
  firestoreInstance = getFirestore(app)
  return firestoreInstance
}

export function getAdminRealtimeDB() {
  if (realtimeInstance) return realtimeInstance
  const app = getFirebaseAdminApp()
  if (!app) return null
  realtimeInstance = getDatabase(app)
  return realtimeInstance
}

