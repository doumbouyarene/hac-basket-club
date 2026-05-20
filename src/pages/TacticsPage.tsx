import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  listGameTactics,
  createGameTactic,
  deleteGameTactic,
  type GameTactic,
} from "@/services/gameTactics.service"
import { useRole } from "../app/useRole"
import { Plus } from "lucide-react"


function getEmbedUrl(url: string): string {
  // YouTube — format watch?v=
  const ytWatch = url.match(/youtube\.com\/watch\?v=([\w-]+)/)
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}?autoplay=1`

  // YouTube — format youtu.be/
  const ytShort = url.match(/youtu\.be\/([\w-]+)/)
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1`

  // YouTube Shorts
  const ytShorts = url.match(/youtube\.com\/shorts\/([\w-]+)/)
  if (ytShorts) return `https://www.youtube.com/embed/${ytShorts[1]}?autoplay=1`

  // Facebook (comportement existant)
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`
}

function formatDateFR(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}



export function TacticsPage() {
  const [items, setItems] = useState<GameTactic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openVideo, setOpenVideo] = useState(false)
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({
    title: "",
    facebook_url: "",
    tactic_type: "",
    description: "",
    })
const [saving, setSaving] = useState(false)
const { role } = useRole()
const isStaff = role === "ADMIN" || role === "COACH"
const [typeFilter, setTypeFilter] = useState<string>("all")
const filteredItems =
  typeFilter === "all"
    ? items
    : items.filter((t) => t.tactic_type === typeFilter)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await listGameTactics()
        setItems(data)
      } catch (e: any) {
        setError(e.message ?? "Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  async function reloadTactics() {
    const data = await listGameTactics()
    setItems(data)
    }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Supports vidéo et consignes tactiques du coach
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
        >
            Tous
        </Button>

        <Button
            variant={typeFilter === "attaque" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("attaque")}
        >
            Attaque
        </Button>

        <Button
            variant={typeFilter === "defense" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("defense")}
        >
            Défense
        </Button>

        <Button
            variant={typeFilter === "pressing" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("pressing")}
        >
            Pressing
        </Button>

        <Button
            variant={typeFilter === "transition" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("transition")}
        >
            Transition
        </Button>
        </div>
      {isStaff && (
        <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une tactique
        </Button>
        )}

      {loading && <div>Chargement…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && items.length === 0 && (
        <div className="text-muted-foreground">
          Aucune tactique disponible.
        </div>
      )}

      <div className="space-y-3">
        {filteredItems.map((t) => (
          <div
            key={t.tactic_id}
            className="rounded-md border bg-background p-4"
          >
            <div
            key={t.tactic_id}
            className="flex items-center justify-between rounded-md border px-4 py-3"
            >
            <div className="min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                {t.tactic_type ?? "—"} • {formatDateFR(t.created_at)}
                </div>
            </div>

            <Button
                size="sm"
                onClick={() => {
                setActiveVideoUrl(t.facebook_url)
                setOpenVideo(true)
                }}
            >
                ▶ Lire
            </Button>
            {isStaff && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                    const ok = confirm("Supprimer cette tactique ?")
                    if (!ok) return

                    await deleteGameTactic(t.tactic_id)
                    await reloadTactics()
                }}
              >
                🗑️
              </Button>
            )}
            </div>

            {t.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {t.description}
              </p>
            )}
          </div>
        ))}
      </div>
      
    
        {activeVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black">
            {/* Bouton fermer */}
            <button
            className="absolute top-4 right-4 z-50 text-white text-2xl"
            onClick={() => setActiveVideoUrl(null)}
            aria-label="Fermer la vidéo"
            >
            ✕
            </button>

            {/* Vidéo Facebook fullscreen */}
            <iframe
            src={getEmbedUrl(activeVideoUrl)}
            className="w-full h-full"
            style={{ border: "none" }}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="Vidéo tactique"
            />
        </div>
        )}

        {openCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-background w-full max-w-lg rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Ajouter une tactique</h3>

            {/* Titre */}
            <div className="space-y-1">
                <label className="text-sm font-medium">Titre</label>
                <input
                className="w-full rounded border px-3 py-2"
                value={form.title}
                onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                }
                />
            </div>

            {/* Lien Facebook */}
            <div className="space-y-1">
                <label className="text-sm font-medium">Lien video</label>
                <input
                className="w-full rounded border px-3 py-2"
                placeholder="https://www.youtube.com/..."
                value={form.facebook_url}
                onChange={(e) =>
                    setForm((f) => ({ ...f, facebook_url: e.target.value }))
                }
                />
            </div>

            {/* Type */}
            <div className="space-y-1">
                <label className="text-sm font-medium">Type</label>
                <select
                className="w-full rounded border px-3 py-2"
                value={form.tactic_type}
                onChange={(e) =>
                    setForm((f) => ({ ...f, tactic_type: e.target.value }))
                }
                >
                <option value="">—</option>
                <option value="attaque">Attaque</option>
                <option value="defense">Défense</option>
                <option value="pressing">Pressing</option>
                <option value="transition">Transition</option>
                </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <textarea
                className="w-full rounded border px-3 py-2"
                rows={3}
                value={form.description}
                onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                }
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
                <Button
                variant="outline"
                onClick={() => setOpenCreate(false)}
                >
                Annuler
                </Button>
                <Button
                disabled={saving}
                onClick={async () => {
                    if (!form.title || !form.facebook_url) return

                    try {
                    setSaving(true)
                    await createGameTactic({
                        title: form.title,
                        facebook_url: form.facebook_url,
                        tactic_type: form.tactic_type || null,
                        description: form.description || null,
                    })
                    setOpenCreate(false)
                    setForm({
                        title: "",
                        facebook_url: "",
                        tactic_type: "",
                        description: "",
                    })
                    await reloadTactics() // ou refetch list
                    } finally {
                    setSaving(false)
                    }
                }}
                >
                {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
            </div>
            </div>
        </div>
        )}
    </div>
  )
}