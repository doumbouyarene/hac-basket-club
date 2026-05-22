import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { Event, Team, EventType } from "../types/db"
import { supabase } from "@/lib/supabase"
import {
  listEvents,
  listPlayerPublicEvents,
  listTeams,
  createEvent,
  updateEvent,
  deleteEvent,
  toErrorMessage,
} from "../lib/api"

import { useRole } from "../app/useRole"
import { CalendarPlus, ClipboardList, Eye, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useParams, useNavigate } from "react-router-dom"

/* ---------------- Types / utils ---------------- */

type FormState = {
  event_id?: string
  team_id: string
  event_type: EventType
  opponent_name: string
  title: string
  start_at: string // datetime-local
  end_at: string   // datetime-local optionnel
  location: string
  notes: string
}

const emptyForm = (teams: Team[]): FormState => ({
  team_id: teams[0]?.team_id ?? "",
  event_type: "TRAINING" as EventType,
  opponent_name: "",
  title: "",
  start_at: "",
  end_at: "",
  location: "",
  notes: "",
})

function normalize(s: string) {
  return s.trim()
}

function formatDateFR(iso: string) {
  return new Date(iso).toLocaleString("fr-FR")
}

function validateForm(f: FormState) {
  if (!f.team_id) return "L’équipe est obligatoire."
  if (!normalize(f.title)) return "Le titre est obligatoire."
  if (!f.start_at) return "La date/heure de début est obligatoire."

  if (f.end_at) {
    const start = new Date(f.start_at).getTime()
    const end = new Date(f.end_at).getTime()
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      return "La fin ne peut pas être avant le début."
    }
  }
  return null
}

function isWin(ev: {
  home_score: number | null
  away_score: number | null
}) {
  if (ev.home_score === null || ev.away_score === null) {
    return false
  }

  return ev.home_score > ev.away_score
}

export function EventTacticsSection() {
  const { eventId } = useParams<{ eventId: string }>()

  if (!eventId) {
    return <div>Événement introuvable</div>
  }
}

/* ---------------- Page ---------------- */

export function EventsPage() {
  const { role, loading: roleLoading, error: roleError } = useRole()
  const isStaff = role === "ADMIN" || role === "COACH"

  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm([]))

  const [presentByEvent, setPresentByEvent] = useState<Record<string, number>>({})
  const [teamSizeByTeam, setTeamSizeByTeam] = useState<Record<string, number>>({})

  const navigate = useNavigate()
  

  const teamById = useMemo(() => {
    const m = new Map<string, Team>()
    teams.forEach((t) => m.set(t.team_id, t))
    return m
  }, [teams])

  async function reload() {
  setLoading(true)
  setError(null)

  try {
    if (isStaff) {
      const [t, e] = await Promise.all([listTeams(), listEvents()])

      setTeams(t)
      setEvents(e)

      const eventIds = e.map((x) => x.event_id)
      const teamIds = Array.from(new Set(e.map((x) => x.team_id).filter(Boolean)))

      if (eventIds.length > 0) {
        const attRes = await supabase
          .from("attendance")
          .select("event_id, status")
          .in("event_id", eventIds)
          .eq("status", "PRESENT")

        if (attRes.error) throw attRes.error

        const tmp: Record<string, number> = {}
        for (const row of attRes.data ?? []) {
          tmp[row.event_id] = (tmp[row.event_id] ?? 0) + 1
        }
        setPresentByEvent(tmp)
      } else {
        setPresentByEvent({})
      }

      if (teamIds.length > 0) {
        const playersRes = await supabase
          .from("players")
          .select("player_id, team_id")
          .in("team_id", teamIds)

        if (playersRes.error) throw playersRes.error

        const tmp: Record<string, number> = {}
        for (const row of playersRes.data ?? []) {
          tmp[row.team_id] = (tmp[row.team_id] ?? 0) + 1
        }
        setTeamSizeByTeam(tmp)
      } else {
        setTeamSizeByTeam({})
      }

      setForm((prev) => ({
        ...emptyForm(t),
        ...prev,
        team_id: prev.team_id || t[0]?.team_id || "",
      }))

      return
    }

    const publicEvents = await listPlayerPublicEvents()
    setEvents(publicEvents as Event[])
    setTeams([])
    setPresentByEvent({})
    setTeamSizeByTeam({})
  } catch (err) {
    setError(toErrorMessage(err))
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
  if (!roleLoading) {
    reload()
  }
  }, [roleLoading, role])

  function resetForm() {
    setForm(emptyForm(teams))
    setFormError(null)
    setSaving(false)
  }

  function openCreate() {
    resetForm()
    setOpen(true)
  }

  function openEdit(ev: Event) {
    setForm({
      event_id: ev.event_id,
      team_id: ev.team_id,
      event_type: ev.event_type,
      title: ev.title,
      start_at: ev.start_at.slice(0, 16),
      end_at: ev.end_at ? ev.end_at.slice(0, 16) : "",
      location: ev.location ?? "",
      notes: ev.notes ?? "",
      opponent_name: ev.opponent_name ?? "",
    })
    setFormError(null)
    setOpen(true)
  }

  async function onSubmit() {
    if (!isStaff) return

    const v = validateForm(form)
    if (v) {
      setFormError(v)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        team_id: form.team_id,
        event_type: form.event_type,
        title: normalize(form.title),
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        location: normalize(form.location) || null,
        notes: normalize(form.notes) || null,
        opponent_name:
            form.event_type === "MATCH"
              ? normalize(form.opponent_name) || null
              : null,

        created_by: null,
      }

      if (form.event_id) {
        const updated = await updateEvent(form.event_id, payload as any)
        setEvents((prev) =>
          prev.map((x) => (x.event_id === updated.event_id ? updated : x))
        )
      } else {
        const created = await createEvent(payload as any)
        setEvents((prev) => [created, ...prev])
      }

      setOpen(false)
      resetForm()
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!isStaff) return
    try {
      await deleteEvent(id)
      setEvents((prev) => prev.filter((x) => x.event_id !== id))
    } catch (err) {
      setError(toErrorMessage(err))
    }
  }

  if (roleLoading) return <div className="p-6">Chargement…</div>
  if (roleError) return <div className="p-6 text-red-600">{roleError}</div>

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Matchs, entraînements et activités
          </p>

        </div>

        {isStaff && (
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v)
              if (!v) resetForm()
            }}
          >
            
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <CalendarPlus className="h-4 w-4 mr-2" />
            </Button>
          </DialogTrigger>

            {/* Dialog scrollable + footer fixe (comme Players) */}
            <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>
                  {form.event_id ? "Modifier événement" : "Ajouter événement"}
                </DialogTitle>
              </DialogHeader>

              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
                {formError && (
                  <div className="text-sm text-red-600">{formError}</div>
                )}

                {/* Équipe */}
                <div className="space-y-2">
                  <Label>Équipe</Label>
                  <Select
                    value={form.team_id}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, team_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une équipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.team_id} value={t.team_id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.event_type}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, event_type: v as EventType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={"TRAINING" as any}>Entraînement</SelectItem>
                      <SelectItem value={"MATCH" as any}>Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {form.event_type === "MATCH" && (
                    <input
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ex : Milo de Kankan"
                      value={form.opponent_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, opponent_name: e.target.value }))
                      }
                    />
                  )}

                {/* Titre */}
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="Ex : Entraînement du mardi"
                  />
                </div>

                {/* Lieu */}
                <div className="space-y-2">
                  <Label>Lieu</Label>
                  <Input
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    placeholder="Ex : Gymnase"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Début</Label>
                    <Input
                      type="datetime-local"
                      value={form.start_at}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, start_at: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin (optionnel)</Label>
                    <Input
                      type="datetime-local"
                      value={form.end_at}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, end_at: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Consignes, objectifs, etc."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3 bg-background">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={onSubmit} disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {/* Table */}
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Lieu</TableHead>
              {isStaff && <TableHead>Présences</TableHead>}
              {isStaff && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isStaff ? 7 : 6}>Chargement…</TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isStaff ? 7 : 6}>Aucun événement</TableCell>
              </TableRow>
            ) : (
              events.map((ev) => {
                const present = presentByEvent[ev.event_id] ?? 0
                const total = teamSizeByTeam[ev.team_id] ?? 0

                return(
                <TableRow key={ev.event_id}>
                  <TableCell>
                    <Badge variant="outline"
                          className={
                          ev.event_type === "MATCH" && isWin(ev)
                            ? "bg-green-100 text-green-800 border-green-200"
                            : ev.event_type === "MATCH" && ev.home_score !== null && ev.away_score !== null && ev.home_score < ev.away_score
                            ? "bg-red-100 text-red-800 border-red-200"
                            : ""
                        }
                        >
                          {ev.event_type}
                      </Badge>
                      {ev.event_type === "MATCH" && ev.opponent_name && (
                        <div className="text-xs text-muted-foreground font-light mt-0.5">
                          vs {ev.opponent_name}
                        </div>
                      )}
                  </TableCell>
                  <TableCell>{ev.title}</TableCell>
                  <TableCell>{formatDateFR(ev.start_at)}</TableCell>
                  <TableCell>{ev.location ?? "—"}</TableCell>
                  {isStaff && (
                  <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {present}/{total}
                    </span>
                    <Link className="text-blue-600 underline" to={`/events/${ev.event_id}/attendance`}>
                      <Eye />
                    </Link>
                  </div>
                </TableCell>
                )}

                  {isStaff && (
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(ev)}>
                          <Pencil />
                        </Button>

                        {ev.event_type === "MATCH" && (
                          <Button size="sm" variant="outline" 
                              onClick={() => navigate(`/events/${ev.event_id}`)}
                                  title="Feuille de match"
                              >
                            <ClipboardList />
                          </Button>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <div className="mt-4 flex justify-end gap-3">
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(ev.event_id)}>
                                Confirmer
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  )}

                </TableRow>
              )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={reload} disabled={loading}>
          Actualiser
        </Button>
      </div>
    </div>
  )
}
