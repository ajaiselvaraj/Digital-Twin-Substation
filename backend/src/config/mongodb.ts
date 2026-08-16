import { MongoClient, Db, GridFSBucket } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017"
const MONGODB_DB = process.env.MONGODB_DB ?? "oceanberg-digital-twin"

let clientPromise: Promise<MongoClient> | null = null

async function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI)
    clientPromise = client.connect()
  }
  return clientPromise
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient()
  return client.db(MONGODB_DB)
}

export async function getSimulationVideoBucket(): Promise<GridFSBucket> {
  const db = await getMongoDb()
  return new GridFSBucket(db, { bucketName: "simulationVideos" })
}

export async function getTestDb(): Promise<Db> {
  const client = await getMongoClient()
  return client.db("test")
}

export async function getCourseVideoBucket(): Promise<GridFSBucket> {
  const db = await getMongoDb()
  return new GridFSBucket(db, { bucketName: "courseVideos" })
}


