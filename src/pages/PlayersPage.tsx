import { useMemo, useState } from "react"
import { usePlayers } from "@/hooks/usePlayers"
import { PlayerRow, PlayerStatus } from "@/services/players.service"
import { useTeams } from "@/hooks/useTeams"

import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Eye, Link, Pencil, Trash2 } from "lucide-react"

/* ---------------- Utils ---------------- */

function normalize(s: string) {
  return s.trim()
}

function validatePlayerInput(p: {
  team_id: string
  first_name: string
  last_name: string
}) {
  const first = normalize(p.first_name)
  const last = normalize(p.last_name)

  if (!p.team_id) return "L’équipe est obligatoire."
  if (!first) return "Le prénom est obligatoire."
  if (!last) return "Le nom est obligatoire."
  if (first.length < 2) return "Le prénom doit contenir au moins 2 caractères."
  if (last.length < 2) return "Le nom doit contenir au moins 2 caractères."
  return null
}

function statusBadge(status: PlayerStatus) {
  switch (status) {
    case "ACTIVE":
      return <Badge>ACTIVE</Badge>
    case "INJURED":
      return <Badge variant="outline">INJURED</Badge>
    case "SUSPENDED":
      return <Badge variant="destructive">SUSPENDED</Badge>
  }
}

function formatAge(birthDate: string | null) {
  if (!birthDate) return "—"
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return `${age} ans`
}

function formatDateFR(date: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("fr-FR")
}

/* ---------------- Types ---------------- */

type FormState = {
  team_id: string
  first_name: string
  last_name: string
  position: string
  status: PlayerStatus
  photo_url: string

  // ✅ PROFIL JOUEUR
  birth_date: string
  birth_place: string
  height_cm: number | ""
  weight_kg: number | ""
  neighborhood: string
}


const emptyForm: FormState = {
  team_id: "",
  first_name: "",
  last_name: "",
  position: "",
  status: "ACTIVE",
  photo_url: "",

  birth_date: "",
  birth_place: "",
  height_cm: "",
  weight_kg: "",
  neighborhood: "",

}

/* ---------------- Page ---------------- */

export function PlayersPage() {
  const { teams, loadingTeams, teamsError } = useTeams()
  const { items, loading, error, search, status, actions } = usePlayers(undefined)

  const [teamFilter, setTeamFilter] = useState<string>("ALL")

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PlayerRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const navigate = useNavigate()

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>()
    teams.forEach((t) => map.set(t.team_id, t.name))
    return map
  }, [teams])

  const filteredItems = useMemo(() => {
    if (teamFilter === "ALL") return items
    return items.filter((p) => p.team_id === teamFilter)
  }, [items, teamFilter])

  const title = editing ? "Modifier le joueur" : "Ajouter un joueur"

  const POSITION_ORDER: Record<string, number> = {
    "meneur": 1,
    "arriere": 2,
    "ailier": 3,
    "ailier fort": 4,
    "pivot": 5,
  }

  const sortedPlayers = [...items].sort((a, b) => {
  const pa = POSITION_ORDER[normalizePosition(a.position) ?? ""] ?? 99
  const pb = POSITION_ORDER[normalizePosition(b.position) ?? ""] ?? 99

    if (pa !== pb) {
      return pa - pb
    }

    // même poste → tri alphabétique
    return (
      a.last_name.localeCompare(b.last_name) ||
      a.first_name.localeCompare(b.first_name)
    )
  })

  function normalizePosition(value?: string | null) {
    return value
      ?.toLowerCase()
      .normalize("NFD")              // supprime les accents
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")          // espaces multiples
      .trim()
  }

  function resetForm() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setSaving(false)
  }

  function openCreate() {
    resetForm()
    setOpen(true)
  }

  function openEdit(p: PlayerRow) {
    setEditing(p)
    setForm({
      team_id: p.team_id,
      first_name: p.first_name,
      last_name: p.last_name,
      position: p.position ?? "",
      status: p.status,
      photo_url: p.photo_url ?? "",

      birth_date: p.birth_date ?? "",
      birth_place: p.birth_place ?? "",
      height_cm: p.height_cm ?? "",
      weight_kg: p.weight_kg ?? "",
      neighborhood: p.neighborhood ?? "",
    })
    setFormError(null)
    setOpen(true)
  }

  async function onSubmit() {
    setFormError(null)

    const err = validatePlayerInput(form)
    if (err) {
      setFormError(err)
      return
    }

    setSaving(true)
    try {
      if (!editing) {
        await actions.add({
          team_id: form.team_id, // ✅ plus de placeholder
          first_name: normalize(form.first_name),
          last_name: normalize(form.last_name),
          position: normalize(form.position) || null,
          status: form.status,
          photo_url: normalize(form.photo_url) || null,
          birth_date: form.birth_date || null,
          birth_place: form.birth_place || null,
          height_cm: form.height_cm === "" ? null : form.height_cm,
          weight_kg: form.weight_kg === "" ? null : form.weight_kg,
          neighborhood: form.neighborhood || null,
        })
      } else {
        await actions.edit(editing.player_id, {
          first_name: normalize(form.first_name),
          last_name: normalize(form.last_name),
          position: normalize(form.position) || null,
          status: form.status,
          photo_url: normalize(form.photo_url) || null,
          birth_date: form.birth_date || null,
          birth_place: form.birth_place || null,
          height_cm: form.height_cm === "" ? null : form.height_cm,
          weight_kg: form.weight_kg === "" ? null : form.weight_kg,
          neighborhood: form.neighborhood || null,
        })
      }
      setOpen(false)
      resetForm()
    } catch (e: any) {
      setFormError(e.message ?? "Erreur sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(player_id: string) {
    try {
      await actions.remove(player_id)
    } catch (e: any) {
      alert(e.message ?? "Erreur suppression")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Joueurs</h2>
          <p className="text-sm text-muted-foreground">
            Gestion de l’effectif par équipe
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>Ajouter</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              {formError && (
                <div className="text-sm text-red-600">{formError}</div>
              )}

              {teamsError && (
                <div className="text-sm text-red-600">
                  Erreur chargement équipes : {teamsError}
                </div>
              )}

              {/* Équipe */}
              <div className="space-y-2">
                <Label>Équipe</Label>
                <Select
                  value={form.team_id}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, team_id: v }))
                  }
                  disabled={loadingTeams}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingTeams ? "Chargement..." : "Choisir une équipe"
                      }
                    />
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

              {/* Prénom / Nom */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, first_name: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, last_name: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* PROFIL JOUEUR */}
              <div className="pt-4 border-t space-y-4">
                <h4 className="text-sm font-semibold">Profil joueur</h4>

                {/* Date + Lieu de naissance */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date de naissance</Label>
                    <Input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, birth_date: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Lieu de naissance</Label>
                    <Input
                      placeholder="Ex : Conakry"
                      value={form.birth_place}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, birth_place: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Taille / Poids */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Taille (cm)</Label>
                    <Input
                      type="number"
                      value={form.height_cm}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          height_cm: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      placeholder="177"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Poids (kg)</Label>
                    <Input
                      type="number"
                      value={form.weight_kg}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          weight_kg: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      placeholder="73"
                    />
                  </div>
                </div>

                {/* Quartier */}
                <div className="space-y-2">
                  <Label>Quartier</Label>
                  <Input
                    placeholder="Ex : Hafia 2"
                    value={form.neighborhood}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, neighborhood: e.target.value }))
                    }
                  />
                </div>
              </div>
              {/* Poste / Statut */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Poste</Label>
                  <Input
                    placeholder="Ex: Meneur"
                    value={form.position}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, position: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, status: v as PlayerStatus }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INJURED">INJURED</SelectItem>
                      <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Photo */}
              <div className="space-y-2">
                <Label>Photo URL (optionnel)</Label>
                <Input
                  placeholder="https://..."
                  value={form.photo_url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, photo_url: e.target.value }))
                  }
                />
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t flex justify-end gap-3 bg-background">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={onSubmit} disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>

            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="sm:max-w-sm"
          placeholder="Rechercher (prénom/nom)..."
          value={search}
          onChange={(e) => actions.setSearch(e.target.value)}
        />

        <div className="flex gap-3">
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrer équipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les équipes</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.team_id} value={t.team_id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(v) => actions.setStatus(v as any)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="INJURED">INJURED</SelectItem>
              <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={actions.reload} disabled={loading}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-red-600">
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Aucun joueur.
                </TableCell>
              </TableRow>
            ) : (
              sortedPlayers.map((p) => (
                <TableRow key={p.player_id}>
                  <TableCell className="font-medium">
                    {p.last_name} {p.first_name}
                  </TableCell>
                  <TableCell>{p.position ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground leading-tight">
                  <div>
                    {formatDateFR(p.birth_date)} • {formatAge(p.birth_date)}
                  </div>
                  <div>
                    {p.height_cm ? `${p.height_cm} cm` : "—"} • {p.weight_kg ? `${p.weight_kg} kg` : "—"}
                  </div>
                  <div>
                    {p.birth_place ?? "—"}{p.neighborhood ? ` — ${p.neighborhood}` : ""}
                  </div>
                </TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">           
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/players/${p.player_id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Supprimer ce joueur ?
                            </AlertDialogTitle>
                          </AlertDialogHeader>
                          <div className="mt-4 flex justify-end gap-3">
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(p.player_id)}>
                              Confirmer
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
