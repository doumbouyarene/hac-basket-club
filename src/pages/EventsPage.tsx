import { useEffect, useMemo, useState } from 'react'
import type { Event, Team, EventType } from '../types/db'
import { listEvents, listTeams, createEvent, updateEvent, deleteEvent, toErrorMessage } from '../lib/api'
import { useRole } from '../app/useRole'
import { Link } from 'react-router-dom'

type FormState = {
  event_id?: string
  team_id: string
  event_type: EventType
  title: string
  start_at: string
  end_at: string
  location: string
  notes: string
}

const emptyForm = (teams: Team[]): FormState => ({
  team_id: teams[0]?.team_id ?? '',
  event_type: 'TRAINING',
  title: '',
  start_at: '',
  end_at: '',
  location: '',
  notes: ''
})

export function EventsPage() {
  const { role, loading: roleLoading, error: roleError } = useRole()
  const isStaff = role === 'ADMIN' || role === 'COACH'

  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(() => emptyForm([]))
  const [saving, setSaving] = useState(false)

  const teamById = useMemo(() => {
    const m = new Map<string, Team>()
    teams.forEach(t => m.set(t.team_id, t))
    return m
  }, [teams])

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const [t, e] = await Promise.all([listTeams(), listEvents()])
      setTeams(t)
      setEvents(e)
      setForm(prev => ({ ...emptyForm(t), ...prev, team_id: prev.team_id || (t[0]?.team_id ?? '') }))
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  function onEdit(ev: Event) {
    setForm({
      event_id: ev.event_id,
      team_id: ev.team_id,
      event_type: ev.event_type,
      title: ev.title,
      start_at: ev.start_at.slice(0, 16), // pour input datetime-local
      end_at: ev.end_at ? ev.end_at.slice(0, 16) : '',
      location: ev.location ?? '',
      notes: ev.notes ?? ''
    })
  }

  function resetForm() {
    setForm(emptyForm(teams))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isStaff) return

    setSaving(true)
    setError(null)

    try {
      const payload = {
        team_id: form.team_id,
        event_type: form.event_type,
        title: form.title.trim(),
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
        created_by: null
      }

      if (form.event_id) {
        const updated = await updateEvent(form.event_id, payload as any)
        setEvents(prev => prev.map(x => x.event_id === updated.event_id ? updated : x))
      } else {
        const created = await createEvent(payload as any)
        setEvents(prev => [created, ...prev])
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
    if (!confirm('Supprimer cet événement ?')) return
    try {
      await deleteEvent(id)
      setEvents(prev => prev.filter(x => x.event_id !== id))
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  if (roleLoading) return <div style={{ padding: 24 }}>Chargement...</div>
  if (roleError) return <div style={{ padding: 24, color: 'crimson' }}>{roleError}</div>

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Événements</h1>

      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div>Chargement...</div>
      ) : (
        <>
          {isStaff && (
            <form onSubmit={onSubmit} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>{form.event_id ? 'Modifier événement' : 'Ajouter événement'}</h3>

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
                      <option key={t.team_id} value={t.team_id}>{t.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Type
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm(f => ({ ...f, event_type: e.target.value as any }))}
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  >
                    <option value="TRAINING">ENTRAÎNEMENT</option>
                    <option value="MATCH">MATCH</option>
                  </select>
                </label>

                <label>
                  Titre
                  <input
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                    required
                  />
                </label>

                <label>
                  Lieu
                  <input
                    value={form.location}
                    onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  />
                </label>

                <label>
                  Début
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => setForm(f => ({ ...f, start_at: e.target.value }))}
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                    required
                  />
                </label>

                <label>
                  Fin (optionnel)
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => setForm(f => ({ ...f, end_at: e.target.value }))}
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  Notes
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                    rows={3}
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

          <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th>Équipe</th>
                <th>Type</th>
                <th>Titre</th>
                <th>Début</th>
                <th>Lieu</th>
                <th>Présences</th>
                {isStaff && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.event_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td>{teamById.get(ev.team_id)?.name ?? ev.team_id}</td>
                  <td>{ev.event_type}</td>
                  <td>{ev.title}</td>
                  <td>{new Date(ev.start_at).toLocaleString('fr-FR')}</td>
                  <td>{ev.location ?? ''}</td>
                  <td>
                    <Link to={`/events/${ev.event_id}/attendance`}>Voir</Link>
                    </td>
                  {isStaff && (
                    <td>
                      <button onClick={() => onEdit(ev)} style={{ marginRight: 8 }}>Modifier</button>
                      <button onClick={() => onDelete(ev.event_id)}>Supprimer</button>
                    </td>
                  )}
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={isStaff ? 6 : 5}>Aucun événement</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}