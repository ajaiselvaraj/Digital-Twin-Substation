import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

import simulationRouter from "./routes/simulation.js"
import diagnosisRouter from "./routes/diagnosis.js"
import videoRouter from "./routes/video.js"
import migrateRouter from "./routes/migrate.js"

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization", "Range"]
}))

// Custom Helmet config to allow range headers and video streaming
app.use(helmet({
  crossOriginResourcePolicy: false
}))

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// API Routes
app.use("/api", simulationRouter)
app.use("/api", diagnosisRouter)
app.use("/api", videoRouter)
app.use("/api", migrateRouter)

// Root health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "digital-twin-backend" })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Server Error]", err)
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`[Express Backend] Server running on port ${PORT}`)
})

export default app
