import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRole } from '../app/useRole'
import type { AttendanceStatus } from '../types/db'
import { ensureAttendanceForEvent, getEventById, listAttendanceByEvent, updateAttendance, toErrorMessage } from '../lib/api'

const STATUSES: AttendanceStatus[] = ['PENDING', 'PRESENT', 'ABSENT', 'EXCUSED', 'LATE']

function initials(first: string, last: string) {
  const a = (first?.trim()?.[0] ?? '').toUpperCase()
  const b = (last?.trim()?.[0] ?? '').toUpperCase()
  return (a + b) || '?'
}

export function AttendancePage() {
  const { eventId } = useParams()
  const { role, loading: roleLoading, error: roleError } = useRole()
  const isStaff = role === 'ADMIN' || role === 'COACH'

  const [event, setEvent] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { PENDING: 0, PRESENT: 0, ABSENT: 0, EXCUSED: 0, LATE: 0 }
    rows.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1 })
    return c
  }, [rows])

  async function refresh() {
    if (!eventId) return
    setError(null)
    setLoading(true)
    try {
      const [ev, att] = await Promise.all([
        getEventById(eventId),
        listAttendanceByEvent(eventId)
      ])
      setEvent(ev)
      setRows(att)
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [eventId])

  async function onGenerate() {
    if (!eventId) return
    if (!isStaff) return
    setWorking(true)
    setError(null)
    try {
      await ensureAttendanceForEvent(eventId)
      await refresh()
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setWorking(false)
    }
  }

  async function onChangeStatus(attendance_id: string, status: AttendanceStatus) {
    if (!isStaff) return
    setWorking(true)
    setError(null)
    try {
      const updated = await updateAttendance(attendance_id, status, null)
      setRows(prev => prev.map(r => r.attendance_id === updated.attendance_id ? { ...r, ...updated } : r))
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setWorking(false)
    }
  }

  if (roleLoading) return <div style={{ padding: 24 }}>Chargement...</div>
  if (roleError) return <div style={{ padding: 24, color: 'crimson' }}>{roleError}</div>

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Présences</h1>

      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div>Chargement...</div>
      ) : (
        <>
          {event && (
            <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <div><strong>{event.title}</strong></div>
              <div>Type : {event.event_type}</div>
              <div>Début : {new Date(event.start_at).toLocaleString('fr-FR')}</div>
              {event.location && <div>Lieu : {event.location}</div>}
              <div style={{ marginTop: 8 }}>
                Synthèse : Présent {counts.PRESENT} | Absent {counts.ABSENT} | Excusé {counts.EXCUSED} | Retard {counts.LATE} | En attente {counts.PENDING}
              </div>

              {isStaff && (
                <div style={{ marginTop: 10 }}>
                  <button onClick={onGenerate} disabled={working}>
                    {working ? '...' : 'Générer / compléter les convocations'}
                  </button>
                </div>
              )}
            </div>
          )}

          <table width="100%" cellPadding={10} style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th>Photo</th>
                <th>Joueur</th>
                <th>Poste</th>
                <th>Statut</th>
                {isStaff && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const p = r.players
                const photo = p?.photo_url as string | null
                return (
                  <tr key={r.attendance_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ width: 70 }}>
                    {photo ? (
                        <img
                        src={photo}
                        alt="Photo joueur"
                        width={44}
                        height={44}
                        style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                        onError={(e) => {
                            // si l'image ne charge pas, on affiche le placeholder
                            const img = e.currentTarget
                            img.style.display = 'none'
                            const placeholder = img.nextElementSibling as HTMLElement | null
                            if (placeholder) placeholder.style.display = 'grid'
                        }}
                        />
                    ) : null}

                    <div
                        style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        display: photo ? 'none' : 'grid',
                        placeItems: 'center',
                        border: '1px solid #ddd',
                        background: '#f6f6f6',
                        fontWeight: 700
                        }}
                        title="Photo à venir"
                    >
                        {initials(p?.first_name ?? '', p?.last_name ?? '')}
                    </div>
                    </td>
                    <td>{p?.last_name} {p?.first_name}</td>
                    <td>{p?.position ?? ''}</td>
                    <td>{r.status}</td>
                    {isStaff && (
                      <td>
                        <select
                          value={r.status}
                          onChange={(e) => onChangeStatus(r.attendance_id, e.target.value as AttendanceStatus)}
                          disabled={working}
                          style={{ padding: 6 }}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={isStaff ? 5 : 4} style={{ padding: 16, opacity: 0.8 }}>Aucune convocation</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}