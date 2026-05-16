import { NavLink } from "react-router-dom"
import { LayoutDashboard, Users, CalendarDays, Tv } from "lucide-react"

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/players", label: "Joueurs", icon: Users },
  { to: "/events", label: "Événements", icon: CalendarDays },
  { to: "/tactics", label: "Tactiques de Jeu", icon: Tv }
]

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-background p-4">
      <div className="mb-6 text-lg font-semibold flex items-center gap-2">
        <div className="h-8 w-8 rounded-md border flex items-center justify-center text-sm">
          CM
        </div>
        Horoya AC
      </div>

      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}