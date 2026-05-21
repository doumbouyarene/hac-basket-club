import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/app/AuthProvider"

function isValidEmail(value: string) {
  // validation simple et suffisante pour un MVP
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function Login() {
  const navigate = useNavigate()

  const [login, setLogin] = useState("")      // login = email
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const { session, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && session) {
      navigate("/")
    }
  }, [isLoading, session, navigate])

  const canSubmit = useMemo(() => {
    return isValidEmail(login) && password.length >= 6 && !loading
  }, [login, password, loading])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!isValidEmail(login)) {
      setError("Le login doit être une adresse email valide.")
      return
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }

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

    navigate("/")
  }

  async function onForgotPassword() {
    setError(null)
    setInfo(null)

    if (!isValidEmail(login)) {
      setError("Saisis ton email dans le champ Login pour recevoir un lien de réinitialisation.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(login.trim(), {
      // tu ajouteras plus tard une page /reset-password si tu veux un vrai flow complet
      redirectTo: window.location.origin + "/login"
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setInfo("Un email de réinitialisation a été envoyé (si le compte existe).")
  }

  if (isLoading) {
    return <div className="p-6">Chargement...</div>
  }

  return (
  <div className="min-h-screen flex">

    {/* Panneau gauche — branding */}
    <div className="hidden md:flex w-1/2 bg-sidebar flex-col items-center justify-center gap-6 p-12">
      <img
        src="/logo.jpg"
        alt="Horoya AC"
        className="h-28 w-28 rounded-full object-cover ring-4 ring-primary/40"
      />
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Horoya AC</h1>
        <p className="text-sidebar-foreground/50 text-sm">Section Basketball — Espace Membres</p>
      </div>
      <div className="mt-8 border-t border-sidebar-border w-32" />
      <p className="text-xs text-sidebar-foreground/30 text-center max-w-xs leading-relaxed">
        Plateforme de gestion interne réservée aux membres du club.
      </p>
    </div>

    {/* Panneau droit — formulaire */}
    <div className="flex-1 flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo mobile uniquement */}
        <div className="flex md:hidden justify-center">
          <img src="/logo.png" alt="Horoya AC" className="h-16 w-16 rounded-full object-cover" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
          <p className="text-sm text-muted-foreground">Accès réservé aux membres du club.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {info && (
          <Alert>
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="login">Email</Label>
            <Input
              id="login"
              type="email"
              placeholder="email@exemple.com"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-primary hover:underline disabled:opacity-50"
                disabled={loading}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {loading ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Problème d'accès ? Contacte l'administrateur.
        </p>
      </div>
    </div>

  </div>
)
}