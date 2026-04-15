import { useEffect, useMemo, useState } from 'react'
import { useRole } from '../app/useRole'

type FormState = {
  player_id?: string
  team_id: string
  first_name: string
  last_name: string
  position: string
  status: PlayerStatus
  user_id: string
  photo_url: string
}

function makeEmptyForm(teams: Team[]): FormState {
  return {
    team_id: teams[0]?.team_id ?? '',
    first_name: '',
    last_name: '',
    position: '',
    status: 'ACTIVE',
    user_id: '',
    photo_url: ''
  }
}

function initials(p: { first_name: string; last_name: string }) {
  const a = (p.first_name?.trim()?.[0] ?? '').toUpperCase()
  const b = (p.last_name?.trim()?.[0] ?? '').toUpperCase()
  return (a + b) || '?'
}

function statusLabel(s: PlayerStatus) {
  switch (s) {
    case 'ACTIVE':
      return 'ACTIF'
    case 'INJURED':
      return 'BLESSE'
    case 'SUSPENDED':
      return 'SUSPENDU'
    default:
      return s
  }
}

export function PlayersPage() {
  const { role, loading: roleLoading, error: roleError } = useRole()
  const isStaff = role === 'ADMIN' || role === 'COACH'

  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(() => makeEmptyForm([]))
  const [saving, setSaving] = useState(false)

  const [query, setQuery] = useState('')

  const teamById = useMemo(() => {
    const m = new Map<string, Team>()
    teams.forEach(t => m.set(t.team_id, t))
    return m
  }, [teams])

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return players
    return players.filter(p => {
      const full = `${p.first_name} ${p.last_name}`.toLowerCase()
      return full.includes(q)
    })
  }, [players, query])

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const [t, p] = await Promise.all([listTeams(), listPlayers()])
      setTeams(t)
      setPlayers(p)

      // Ajuster le form si team_id vide
      setForm(prev => {
        const next = { ...prev }
        if (!next.team_id) next.team_id = t[0]?.team_id ?? ''
        return next
      })
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  function resetForm() {
    setForm(makeEmptyForm(teams))
  }

  function onEdit(p: Player) {
    setForm({
      player_id: p.player_id,
      team_id: p.team_id,
      first_name: p.first_name,
      last_name: p.last_name,
      position: p.position ?? '',
      status: p.status,
      user_id: p.user_id ?? '',
      photo_url: p.photo_url ?? ''
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isStaff) return

    setSaving(true)
    setError(null)

    try {
      if (!form.team_id) {
        throw new Error("Aucune équipe sélectionnée. Crée d'abord une équipe.")
      }

      const payload = {
        team_id: form.team_id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        position: form.position.trim() ? form.position.trim() : null,
        status: form.status,
        user_id: form.user_id.trim() ? form.user_id.trim() : null,
        photo_url: form.photo_url.trim() ? form.photo_url.trim() : null
      }

      if (form.player_id) {
        const updated = await updatePlayer(form.player_id, payload as any)
        setPlayers(prev => prev.map(x => (x.player_id === updated.player_id ? updated : x)))
      } else {
        const created = await createPlayer(payload as any)
        setPlayers(prev => [created, ...prev])
      }

      resetForm()
    } catch (e2) {
      setError(toErrorMessage(e2))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!isStaff) return
    const ok = confirm('Supprimer ce joueur ?')
    if (!ok) return

    setError(null)
    try {
      await deletePlayer(id)
      setPlayers(prev => prev.filter(p => p.player_id !== id))
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  if (roleLoading) return <div style={{ padding: 24 }}>Chargement...</div>
  if (roleError) return <div style={{ padding: 24, color: 'crimson' }}>{roleError}</div>

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Joueurs</h1>
        <div style={{ opacity: 0.8 }}>Rôle : {role}</div>
      </div>

      {error && <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ marginTop: 16 }}>Chargement...</div>
      ) : (
        <>
          {teams.length === 0 ? (
            <div style={{ marginTop: 16, padding: 12, border: '1px solid #f0c', borderRadius: 8 }}>
              <strong>Aucune équipe trouvée.</strong>
              <div style={{ marginTop: 6 }}>
                Crée au moins une équipe dans la table <code>teams</code> avant d’ajouter des joueurs.
              </div>
            </div>
          ) : (
            <>
              {/* Bloc formulaire (staff uniquement) */}
              {isStaff && (
                <form
                  onSubmit={onSubmit}
                  style={{
                    border: '1px solid #ddd',
                    padding: 12,
                    borderRadius: 8,
                    marginTop: 16,
                    marginBottom: 16
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    {form.player_id ? 'Modifier joueur' : 'Ajouter joueur'}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label>
                      Équipe
                      <select
                        value={form.team_id}
                        onChange={(e) => setForm(f => ({ ...f, team_id: e.target.value }))}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                        required
                      >
                        {teams.map(t => (
                          <option key={t.team_id} value={t.team_id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Statut
                      <select
                        value={form.status}
                        onChange={(e) => setForm(f => ({ ...f, status: e.target.value as PlayerStatus }))}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                      >
                        <option value="ACTIVE">ACTIF</option>
                        <option value="INJURED">BLESSE</option>
                        <option value="SUSPENDED">SUSPENDU</option>
                      </select>
                    </label>

                    <label>
                      Prénom
                      <input
                        value={form.first_name}
                        onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                        required
                      />
                    </label>

                    <label>
                      Nom
                      <input
                        value={form.last_name}
                        onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                        required
                      />
                    </label>

                    <label>
                      Poste
                      <input
                        value={form.position}
                        onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))}
                        placeholder="PG/SG/SF/PF/C"
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                      />
                    </label>

                    <label>
                      Photo (URL) — placeholder
                      <input
                        value={form.photo_url}
                        onChange={(e) => setForm(f => ({ ...f, photo_url: e.target.value }))}
                        placeholder="https://... (optionnel)"
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                      />
                    </label>

                    <label style={{ gridColumn: '1 / -1' }}>
                      user_id (UUID Auth) — optionnel
                      <input
                        value={form.user_id}
                        onChange={(e) => setForm(f => ({ ...f, user_id: e.target.value }))}
                        placeholder="UUID (si joueur a un compte Supabase)"
                        style={{ width: '100%', padding: 8, marginTop: 4 }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="submit" disabled={saving}>
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button type="button" onClick={resetForm} disabled={saving}>
                      Réinitialiser
                    </button>
                  </div>
                </form>
              )}

              {/* Recherche */}
              <div style={{ marginTop: 8, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un joueur (nom/prénom)"
                  style={{ flex: 1, padding: 10 }}
                />
                <button onClick={refresh}>Rafraîchir</button>
              </div>

              {/* Liste */}
              <div style={{ overflowX: 'auto' }}>
                <table width="100%" cellPadding={10} style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                      <th>Photo</th>
                      <th>Équipe</th>
                      <th>Joueur</th>
                      <th>Poste</th>
                      <th>Statut</th>
                      {isStaff && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map(p => (
                      <tr key={p.player_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ width: 70 }}>
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt="photo joueur"
                              width={44}
                              height={44}
                              style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                border: '1px solid #ddd',
                                background: '#f6f6f6',
                                fontWeight: 700
                              }}
                              title="Photo à venir"
                            >
                              {initials(p)}
                            </div>
                          )}
                        </td>
                        <td>{teamById.get(p.team_id)?.name ?? p.team_id}</td>
                        <td>{p.last_name} {p.first_name}</td>
                        <td>{p.position ?? ''}</td>
                        <td>{statusLabel(p.status)}</td>
                        {isStaff && (
                          <td>
                            <button onClick={() => onEdit(p)} style={{ marginRight: 8 }}>
                              Modifier
                            </button>
                            <button onClick={() => onDelete(p.player_id)}>
                              Supprimer
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {filteredPlayers.length === 0 && (
                      <tr>
                        <td colSpan={isStaff ? 6 : 5} style={{ padding: 16, opacity: 0.8 }}>
                          Aucun joueur
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Note sécurité */}
      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.7 }}>
        Les droits d’accès sont appliqués côté base (RLS). L’interface masque seulement les actions non autorisées. [2](https://supabase.com/docs/guides/database/postgres/row-level-security)
      </div>
    </div>
  )
}
``
import type { Player, Team, PlayerStatus } from '../types/db'
import {
  listPlayers,
  listTeams,
  createPlayer,
  updatePlayer,
  deletePlayer,
  toErrorMessage
} from '../lib/api'
