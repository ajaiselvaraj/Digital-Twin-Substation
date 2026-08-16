// Script to push dummy data to Firebase
// Run with: npx tsx scripts/push-dummy-data-to-firebase.ts

import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc } from "firebase/firestore"
import { DUMMY_SUBSTATIONS } from "../lib/dummy-data"

const firebaseConfig = {
  apiKey: "AIzaSyDAeaXEwDT66UjCe1dqRrHu4cwWoL7vfF4",
  authDomain: "oceanberg-digitaltwin.firebaseapp.com",
  projectId: "oceanberg-digitaltwin",
  storageBucket: "oceanberg-digitaltwin.firebasestorage.app",
  messagingSenderId: "403206405780",
  appId: "1:403206405780:web:6a5581e174f7b084363e81",
  measurementId: "G-5J2SXQ0229",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function pushDummyData() {
  console.log("Starting to push dummy data to Firebase...")
  
  try {
    for (const substation of DUMMY_SUBSTATIONS) {
      const docRef = await addDoc(collection(db, "substations"), {
        ...substation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      console.log(`✓ Pushed substation ${substation.master.name} with ID: ${docRef.id}`)
    }
    
    console.log("\n✅ All dummy data pushed successfully!")
  } catch (error) {
    console.error("❌ Error pushing data:", error)
    process.exit(1)
  }
}

pushDummyData()



