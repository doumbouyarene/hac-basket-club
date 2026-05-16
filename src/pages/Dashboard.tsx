import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users, CalendarDays, CheckCircle2 } from "lucide-react"
import { useDashboardKpis } from "@/hooks/useDashboardKpis"

export function Dashboard() {
  const { data, loading, error } = useDashboardKpis()

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Erreur lors du chargement du dashboard : {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Vue d’ensemble
        </h2>
        <p className="text-sm text-muted-foreground">
          Indicateurs clés du club
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <KpiCard
          title="Joueurs"
          value={loading ? "—" : data?.playersCount}
          icon={Users}
          subtitle="joueurs enregistrés"
        />

        <KpiCard
          title="Événements"
          value={loading ? "—" : data?.eventsCount}
          icon={CalendarDays}
          subtitle="entraînements / matchs"
        />

        <KpiCard
          title="Présents aujourd’hui"
          value={loading ? "—" : data?.presentToday}
          icon={CheckCircle2}
          subtitle="dernière séance"
        />
      </div>
    </div>
  )
}

type KpiCardProps = {
  title: string
  value?: number | string
  subtitle: string
  icon: React.ElementType
}

function KpiCard({ title, value, subtitle, icon: Icon }: KpiCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}