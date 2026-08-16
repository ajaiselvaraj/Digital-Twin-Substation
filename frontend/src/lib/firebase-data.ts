// Firebase data service - fetches from Firestore
import { collection, getDocs, doc, getDoc, deleteDoc, query, where, limit } from "firebase/firestore"
import { getFirestoreDB } from "./firebase"

// Get Firestore instance (lazy initialization)
const db = getFirestoreDB()
import type { DummySubstation } from "./dummy-data"

// Fetch all substations from Firebase
export async function getAllSubstationsFromFirebase(): Promise<DummySubstation[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "substations"))
    const substations: DummySubstation[] = []
    
    querySnapshot.forEach((docSnapshot) => {
      substations.push({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      } as DummySubstation)
    })
    
    return substations
  } catch (error) {
    console.error("Error fetching from Firebase:", error)
    throw error
  }
}

// Fetch substation by ID from Firebase
export async function getSubstationByIdFromFirebase(id: string): Promise<DummySubstation | undefined> {
  try {
    const docRef = doc(db, "substations", id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as DummySubstation
    }
    
    return undefined
  } catch (error) {
    console.error("Error fetching from Firebase:", error)
    throw error
  }
}

// Delete substation from Firebase
export async function deleteSubstation(id: string): Promise<void> {
  try {
    const docRef = doc(db, "substations", id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("Error deleting substation:", error)
    throw error
  }
}

// Export all functions for use in components
export { getAllSubstationsFromFirebase as getAllSubstations }
export { getSubstationByIdFromFirebase as getSubstationById }

export async function getSubstationByCodeFromFirebase(substationCode: string): Promise<DummySubstation | undefined> {
  const trimmedCode = substationCode?.trim()
  if (!trimmedCode) return undefined
  try {
    const substationQuery = query(
      collection(db, "substations"),
      where("master.substationCode", "==", trimmedCode),
      limit(1),
    )
    const snapshot = await getDocs(substationQuery)
    if (snapshot.empty) {
      return undefined
    }
    const docSnapshot = snapshot.docs[0]
    return { id: docSnapshot.id, ...docSnapshot.data() } as DummySubstation
  } catch (error) {
    console.error("Error fetching substation by code from Firebase:", error)
    throw error
  }
}



