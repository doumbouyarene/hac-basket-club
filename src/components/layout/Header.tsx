import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogOut } from 'lucide-react';
import { supabase } from "@/lib/supabase"

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/players": "Joueurs",
  "/events": "Événements",
  "/tactics": "Tactiques",
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const title = titles[location.pathname] ?? "Horoya Athletic Club"

  async function logout() {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-3">

        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </header>
  )
}