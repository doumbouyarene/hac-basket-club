import express from "express"
import dotenv from "dotenv"
import eventsRouter from "./routes/events"

dotenv.config()

const app = express()

// Middleware JSON
app.use(express.json())

// Healthcheck
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "backend" })
})

// Routes API
app.use("/api", eventsRouter)

const port = Number(process.env.PORT) || 3001

app.listen(port, () => {
  console.log(`Backend démarré sur http://localhost:${port}`)
})