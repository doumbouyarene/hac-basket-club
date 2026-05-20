import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogOut, Menu } from "lucide-react"
import { supabase } from "@/lib/supabase"

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/players": "Joueurs",
  "/events": "Événements",
  "/tactics": "Tactiques",
}

type HeaderProps = {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const title = titles[location.pathname] ?? "Horoya Athletic Club"

  async function logout() {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile uniquement */}
        <button
          onClick={onMenuClick}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        className="text-muted-foreground hover:text-foreground gap-2"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Déconnexion</span>
      </Button>
    </header>
  )
}