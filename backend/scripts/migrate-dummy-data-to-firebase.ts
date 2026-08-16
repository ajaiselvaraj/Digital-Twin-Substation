/**
 * Migration script to push dummy data to Firebase
 * Run this once to migrate all dummy substations to Firebase
 * 
 * Usage: npx tsx scripts/migrate-dummy-data-to-firebase.ts
 */

import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "../lib/firebase"
// @ts-ignore - Importing for migration only
import { DUMMY_SUBSTATIONS } from "../lib/dummy-data"

async function migrateDummyDataToFirebase() {
  try {
    console.log("Starting migration of dummy data to Firebase...")

    // Check if data already exists
    const existingDocs = await getDocs(collection(db, "substations"))
    if (existingDocs.size > 0) {
      console.log(`Found ${existingDocs.size} existing substations in Firebase.`)
      console.log("Skipping migration to avoid duplicates.")
      console.log("If you want to add dummy data anyway, delete existing documents first.")
      return
    }

    let successCount = 0
    let skippedCount = 0

    // Add each dummy substation to Firebase
    for (const substation of DUMMY_SUBSTATIONS) {
      try {
        // Check if substation with same code already exists
        const q = query(
          collection(db, "substations"),
          where("master.substationCode", "==", substation.master.substationCode)
        )
        const existing = await getDocs(q)

        if (existing.empty) {
          // Remove the id field as Firebase will generate it
          const { id, ...substationData } = substation
          const docRef = await addDoc(collection(db, "substations"), {
            ...substationData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          console.log(`✓ Added substation: ${substation.master.name} (ID: ${docRef.id})`)
          successCount++
        } else {
          console.log(`⊘ Skipped (already exists): ${substation.master.name}`)
          skippedCount++
        }
      } catch (error) {
        console.error(`✗ Error adding substation ${substation.master.name}:`, error)
      }
    }

    console.log("\nMigration completed!")
    console.log(`Successfully migrated ${successCount} substations to Firebase. ${skippedCount} skipped.`)
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateDummyDataToFirebase()
    .then(() => {
      console.log("Migration script finished.")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Migration script failed:", error)
      process.exit(1)
    })
}

export { migrateDummyDataToFirebase }
