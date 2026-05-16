import { Router, Request, Response } from "express"
import { generatePresencePdfForEvent } from "../services/pdf/generatePresencePdf"

const router = Router()


router.post(
  "/events/:eventId/presences/pdf",
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId

      // Validation stricte
      if (typeof eventId !== "string" || eventId.trim().length === 0) {
        return res.status(400).json({ message: "eventId manquant ou invalide" })
      }

      const pdfBuffer = await generatePresencePdfForEvent(eventId)

      res.status(200)
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="presence_${eventId}.pdf"`
      )
      return res.send(pdfBuffer)
    } catch (err: any) {
      console.error("Erreur route PDF présences:", err)
      return res.status(500).json({
        message: "Erreur lors de la génération du PDF",
        details: err?.message ?? String(err),
      })
    }
  }
)

export default router

router.route("/events/:eventId/presences/pdf")
  .get(async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId

      if (typeof eventId !== "string" || eventId.trim() === "") {
        return res.status(400).json({ message: "eventId manquant ou invalide" })
      }

      const pdfBuffer = await generatePresencePdfForEvent(eventId)

      res.setHeader("Content-Type", "application/pdf")
      res.setHeader(
        "Content-Disposition",
        `inline; filename="presence_${eventId}.pdf"`
      )

      return res.send(pdfBuffer)
    } catch (err: any) {
      console.error(err)
      return res.status(500).json({
        message: "Erreur génération PDF",
        details: err?.message,
      })
    }
  })
  .post(async (req: Request, res: Response) => {
    try {
      const eventId = req.params.eventId

      if (typeof eventId !== "string" || eventId.trim() === "") {
        return res.status(400).json({ message: "eventId manquant ou invalide" })
      }

      const pdfBuffer = await generatePresencePdfForEvent(eventId)

      res.setHeader("Content-Type", "application/pdf")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="presence_${eventId}.pdf"`
      )

      return res.send(pdfBuffer)
    } catch (err: any) {
      console.error(err)
      return res.status(500).json({
        message: "Erreur génération PDF",
        details: err?.message,
      })
    }
  })
