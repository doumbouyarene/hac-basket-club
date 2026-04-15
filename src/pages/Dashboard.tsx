import { Link } from 'react-router-dom'
import { useAuth } from '../app/AuthProvider'
import { useRole } from '../app/useRole'

export function Dashboard() {
  const { session, signOut } = useAuth()
  const { role, loading } = useRole()

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Dashboard</h1>
      <p>Connecté : {session?.user?.email}</p>
      <p>Rôle : {loading ? '...' : role}</p>

      <nav style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Link to="/events">Événements</Link>
        <Link to="/players">Joueurs</Link>
      </nav>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => signOut()}>Se déconnecter</button>
      </div>
    </div>
  )
}