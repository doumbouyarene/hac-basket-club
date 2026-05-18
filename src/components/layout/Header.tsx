import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
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
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>

      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        className="text-muted-foreground hover:text-foreground gap-2"
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </Button>
    </header>
  )
}