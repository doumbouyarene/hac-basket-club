import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  listGameTactics,
  createGameTactic,
  deleteGameTactic,
  type GameTactic,
} from "@/services/gameTactics.service"
import { useRole } from "../app/useRole"
import { Plus, Play, Trash, X, ExternalLink } from "lucide-react"


function getEmbedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)

    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v")
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null
      }

      if (url.pathname.startsWith("/shorts/")) {
        const videoId = url.pathname.split("/")[2]
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null
      }

      if (url.pathname.startsWith("/embed/")) {
        return rawUrl
      }
    }

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.replace("/", "")
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null
    }

    if (url.hostname.includes("facebook.com") || url.hostname.includes("fb.watch")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=false&width=900`
    }

    return null
  } catch {
    return null
  }
}

function isValidUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
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
                const embedUrl = getEmbedUrl(t.facebook_url)

                if (embedUrl) {
                  setActiveVideoUrl(t.facebook_url)
                  setOpenVideo(true)
                } else {
                  window.open(t.facebook_url, "_blank", "noopener,noreferrer")
                }
              }}
            >
                <Play /> Lire
            </Button>
            <Button
                size="sm"
                variant="outline"
                title="Ouvrir le lien"
                onClick={() => {
                  if (!isValidUrl(t.facebook_url)) {
                    alert("Lien vidéo invalide")
                    return
                  }

                  window.open(t.facebook_url, "_blank", "noopener,noreferrer")
                }}
              >
                <ExternalLink className="h-4 w-4" />
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
                <Trash /> 
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
                onClick={() => {
                  setActiveVideoUrl(null)
                  setOpenVideo(false)
                }}
                aria-label="Fermer la vidéo"
              >
            <X />
            </button>

            {/* Vidéo Facebook fullscreen */}
            <iframe
              src={getEmbedUrl(activeVideoUrl) ?? activeVideoUrl}
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