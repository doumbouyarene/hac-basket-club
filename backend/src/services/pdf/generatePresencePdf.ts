import PDFDocument from "pdfkit"
import path from "path"
import { fetchPresenceData } from "../data/fetchPresenceData"

/**
 * Normalisation des positions (sécurité)
 */
function normalizePosition(value?: string | null): string {
  return (
    value
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim() || ""
  )
}

/**
 * Ordre métier des positions
 */

const POSITION_ORDER = [
  "meneur",
  "arriere",
  "ailier",
  "ailier fort",
  "pivot",
  "sans poste", // ✅ AJOUT OBLIGATOIRE
]

export async function generatePresencePdfForEvent(
  eventId: string
): Promise<Buffer> {
  const { event, attendance } = await fetchPresenceData(eventId)

  return new Promise<Buffer>((resolve, reject) => {
    try {
      // ========= Doc =========
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []

      doc.on("data", (c) => chunks.push(c))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", (err) => reject(err))

      // ========= Assets =========
      const logoPath = path.join(process.cwd(), "assets", "logo.jpg")
      const signaturePath = path.join(
        process.cwd(),
        "assets",
        "signature_coach.png"
      )

      // ========= Page helpers =========
      const pageWidth = doc.page.width
      const leftMargin = doc.page.margins.left
      const rightMargin = doc.page.margins.right
      const blockWidth = 420
      const centerX = (pageWidth - blockWidth) / 2

      // ========= Logo + Header =========
      doc.image(logoPath, leftMargin, 40, { width: 60 })

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#a71335")
        .text("HOROYA ATHLETIC CLUB", leftMargin + 75, 45)

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("black")
        .text("SECTION BASKET-BALL", leftMargin + 75, 62)

      doc
        .font("Helvetica")
        .fontSize(9)
        .text("Matam · Conakry · République de Guinée", leftMargin + 75, 78)

      doc.moveDown(4)

      // ========= Séparateur rouge épais =========
      doc
        .moveTo(leftMargin, doc.y)
        .lineTo(pageWidth - rightMargin, doc.y)
        .lineWidth(6)
        .strokeColor("#d34364")
        .stroke()

      doc.moveDown(1.5)

      // ========= Bloc convocation (CENTRÉ) =========
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("black")
        .text("LISTE DE CONVOCATION", centerX, doc.y, {
          width: blockWidth,
          align: "center",
        })

      doc.moveDown(0.4)

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Coupe Nationale de Basket-Ball", {
          width: blockWidth,
          align: "center",
        })

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Général Mamady Doumbouya", {
          width: blockWidth,
          align: "center",
        })

      doc.moveDown(1)

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#a71335")
        .text(
          `HOROYA ATHLETIC CLUB vs ${event.opponent_name ?? "ADVERSAIRE"}`,
          {
            width: blockWidth,
            align: "center",
          }
        )

      doc.moveDown(0.3)

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("black")
        .text(
          new Date(event.start_at).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          {
            width: blockWidth,
            align: "center",
          }
        )

      doc.moveDown(2)
      
        // ========= Regroupement joueurs par position =========
        const byPosition: Record<string, string[]> = {}

        
        attendance.forEach((row) => {
        const rel = (row as any).player

        // tableau
        const player = Array.isArray(rel) ? rel[0] : rel
        if (!player) return

        const pos = normalizePosition(player.position) || "sans poste"

        if (!byPosition[pos]) {
            byPosition[pos] = []
        }

        byPosition[pos].push(`${player.last_name} ${player.first_name}`)
        })


      // ========= Liste des joueurs PAR POSITION (CENTRÉE) =========
      let counter = 1

      POSITION_ORDER.forEach((pos) => {
        const players = byPosition[pos]
        if (!players || players.length === 0) return

        // Titre position
        doc
          .moveDown(1)
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#feacc0")
          .text(pos.toUpperCase(), centerX, doc.y, {
            width: blockWidth,
            align: "center",
          })

        doc.moveDown(0.4)

        // Joueurs
        doc.font("Helvetica").fontSize(11).fillColor("black")

        players.forEach((name) => {
          doc.text(`${counter}. ${name}`, {
            width: blockWidth,
            align: "center",
          })
          counter++
        })
      })

      // ========= Signature =========
      doc.moveDown(3)

      doc.font("Helvetica").fontSize(10).text("Le Staff", {
        align: "right",
      })

      doc.moveDown(0.3)

      // ========= End =========
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}