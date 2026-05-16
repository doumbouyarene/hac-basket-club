import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { PlayersPage } from "@/pages/PlayersPage"
import { EventsPage } from "@/pages/EventsPage"
import { TacticsPage } from "./pages/TacticsPage"
import { AttendancePage } from "@/pages/AttendancePage"
import { PlayerDetailsPage } from "@/pages/PlayerDetailsPage"
import { EventDetailsPage } from "@/pages/EventDetailsPage"


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Layout admin SUR LA RACINE */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="tactics" element={<TacticsPage />} />
          <Route path="events/:eventId/attendance" element={<AttendancePage />} />
          <Route path="players/:playerId" element={<PlayerDetailsPage />} />
          <Route path="/events/:eventId" element={<EventDetailsPage />} />

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}