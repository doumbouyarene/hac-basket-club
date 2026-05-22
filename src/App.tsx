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
import { ProtectedRoute } from "@/app/ProtectedRoute"
import { MyPlayerPage } from "@/pages/MyPlayerPage"


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="me" element={<MyPlayerPage />} />
          <Route
            path="players"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "COACH"]}>
                <PlayersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="players/:playerId"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "COACH"]}>
                <PlayerDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:eventId" element={<EventDetailsPage />} />
          <Route path="events/:eventId/attendance" element={<AttendancePage />} />
          <Route path="tactics" element={<TacticsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}