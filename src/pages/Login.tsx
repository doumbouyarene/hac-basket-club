import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Login() {
  const [login, setLogin] = useState('') // login = email au MVP
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: login.trim(),
      password
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', fontFamily: 'system-ui' }}>
      <h1>Connexion</h1>

      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginTop: 12 }}>
          Login
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="email@exemple.com"
            autoComplete="username"
            style={{ width: '100%', padding: 10, marginTop: 6 }}
            required
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{ width: '100%', padding: 10, marginTop: 6 }}
            required
          />
        </label>

        {error && <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12, marginTop: 16 }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
