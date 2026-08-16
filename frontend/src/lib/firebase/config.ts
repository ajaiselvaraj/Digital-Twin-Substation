// Firebase Realtime Database configuration
import { getDatabase } from "firebase/database"
import app from "../firebase"

// Note: Add databaseURL to firebase.ts config when setting up Realtime Database
// databaseURL: "https://your-project-id-default-rtdb.firebaseio.com"
export const realtimeDB = getDatabase(app)

