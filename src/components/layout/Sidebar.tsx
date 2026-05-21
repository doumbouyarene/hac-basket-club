import { NavLink } from "react-router-dom"
import { LayoutDashboard, Users, CalendarDays, Tv, X } from "lucide-react"

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/players", label: "Joueurs", icon: Users },
  { to: "/events", label: "Événements", icon: CalendarDays },
  { to: "/tactics", label: "Tactiques de Jeu", icon: Tv },
]

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside
      className={[
        "bg-sidebar text-sidebar-foreground flex flex-col min-h-screen w-64 shrink-0",
        // Mobile : tiroir fixe avec transition
        "fixed inset-y-0 left-0 z-30 transition-transform duration-300 md:relative md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Horoya AC"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/50"
          />
          <div>
            <div className="text-sm font-bold text-white leading-tight">Horoya AC</div>
            <div className="text-xs text-sidebar-foreground/50 leading-tight">Section Basketball</div>
          </div>
        </div>

        {/* Bouton fermer — mobile uniquement */}
        <button
          onClick={onClose}
          className="md:hidden text-sidebar-foreground/50 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "bg-primary text-white font-medium shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/30">HAC Manager v1.0</p>
      </div>
    </aside>
  )
}