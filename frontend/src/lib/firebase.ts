// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app"
import { getAnalytics } from "firebase/analytics"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"

// Your web app's Firebase configuration
// NOTE:
// - `storageBucket` must be the actual bucket ID (typically `<projectId>.appspot.com`)
//   and NOT the HTTPS download domain (`*.firebasestorage.app`). Using the wrong
//   value here causes Storage operations (upload/getDownloadURL) to hang and
//   eventually fail with `storage/retry-limit-exceeded`.
const firebaseConfig = {
  apiKey: "AIzaSyDAeaXEwDT66UjCe1dqRrHu4cwWoL7vfF4",
  authDomain: "oceanberg-digitaltwin.firebaseapp.com",
  projectId: "oceanberg-digitaltwin",
  storageBucket: "oceanberg-digitaltwin.appspot.com",
  messagingSenderId: "403206405780",
  appId: "1:403206405780:web:6a5581e174f7b084363e81",
  measurementId: "G-5J2SXQ0229",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    "https://oceanberg-digitaltwin-default-rtdb.asia-southeast1.firebasedatabase.app",
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize services
export const storage = getStorage(app)
export const auth = getAuth(app)

// Lazy initialization of Firestore to avoid connection warnings when not needed
let firestoreInstance: ReturnType<typeof getFirestore> | null = null
export function getFirestoreDB() {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(app)
    // Configure Firestore to be more tolerant of connection issues
    // This reduces warnings when Firestore can't connect immediately
    try {
      // Firestore will work in offline mode if connection fails
      // The warning is harmless and doesn't affect functionality
    } catch (error) {
      // Ignore initialization errors - Firestore will work offline
    }
  }
  return firestoreInstance
}

// Export db as a getter for backward compatibility (lazy initialization)
// This prevents Firestore from connecting until actually used
export const db = getFirestoreDB()

// Firebase Authentication credentials
const FIREBASE_USER_EMAIL = process.env.FIREBASE_USER_EMAIL || "nithisht.bt22@bitsathy.ac.in"
const FIREBASE_USER_PASSWORD = process.env.FIREBASE_USER_PASSWORD || "nithish871"
const FIREBASE_UID = process.env.FIREBASE_UID || "gWozEL81rIMg3YgQ7Yqldbhf2933"

// Sign in to Firebase (server-side only)
let authInitialized = false
let authPromise: Promise<void> | null = null

export async function initializeFirebaseAuth() {
  if (authInitialized) return
  if (authPromise) return authPromise
  
  authPromise = (async () => {
    try {
      // Only sign in on server-side (Node.js environment)
      if (typeof window === "undefined") {
        console.log("[Firebase Auth] Attempting to sign in...")
        const userCredential = await signInWithEmailAndPassword(auth, FIREBASE_USER_EMAIL, FIREBASE_USER_PASSWORD)
        console.log("[Firebase Auth] Successfully authenticated, UID:", userCredential.user.uid)
        authInitialized = true
      }
    } catch (error: any) {
      console.error("[Firebase Auth] Authentication failed:", error?.message || error)
      // Continue anyway - might work with public access or if already authenticated
      authInitialized = true // Set to true to prevent retry loops
    }
  })()
  
  return authPromise
}

// Get the UID to use for fetching data
export function getFirebaseUID(): string {
  return FIREBASE_UID
}

// Initialize Analytics (only in browser)
if (typeof window !== "undefined") {
  getAnalytics(app)
}

export default app



