import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

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

    navigate("/dashboard")
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

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* En-tête branding minimal */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl border bg-background flex items-center justify-center">
            <span className="text-sm font-semibold">CB</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Club Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connexion sécurisée
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle>Se connecter</CardTitle>
            <CardDescription>
              Utilise ton email et ton mot de passe.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {(error || info) && (
              <div className="mb-4">
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
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Login</Label>
                <Input
                  id="login"
                  type="email"
                  placeholder="email@exemple.com"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Le login correspond à ton email.
                </p>
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
                {loading ? "Connexion..." : "Se connecter"}
              </Button>

              <Separator />

              <div className="text-xs text-muted-foreground leading-relaxed">
                En cas de problème d’accès, contacte l’administrateur de l’application.
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Club Manager
        </div>
      </div>
    </div>
  )
}