import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Trophy, TrendingUp, UserCheck, Award } from "lucide-react"
import { useDashboardKpis } from "@/hooks/useDashboardKpis"

export function Dashboard() {
  const { data, loading, error } = useDashboardKpis()

  if (error) return <div className="text-sm text-red-600">Erreur : {error}</div>

  const v = (val: any) => loading ? "—" : val

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Vue d'ensemble</h2>
        <p className="text-sm text-muted-foreground">Indicateurs clés du club</p>
      </div>

      {/* Ligne 1 — Effectif + Top joueurs */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Effectif & Leaders</h3>
        <div className="grid gap-4 md:grid-cols-5">
          <KpiCard title="Joueurs actifs" value={v(data?.playersActive)} icon={Users} sub="dans l'effectif" />
          <TopCard title="Top Scoreur" player={loading ? null : data?.topScorer} label="pts/match" icon={Award} />
          <TopCard title="Top Passeur" player={loading ? null : data?.topAssist} label="ast/match" icon={Award} />
          <TopCard title="Top Contres" player={loading ? null : data?.topBlocks} label="blk/match" icon={Award} />
          <TopCard title="Top Interceptions" player={loading ? null : data?.topSteals} label="int/match" icon={Award} />
        </div>
      </section>

      {/* Ligne 2 — Résultats */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Résultats saison</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard title="Victoires" value={v(data?.wins)} icon={Trophy} sub="matchs gagnés" accent="green" />
          <KpiCard title="Défaites" value={v(data?.losses)} icon={Trophy} sub="matchs perdus" accent="red" />
          <KpiCard title="% Victoires" value={v(data?.winRate !== undefined ? `${data?.winRate}%` : "—")} icon={TrendingUp} sub="taux de réussite" />
          <KpiCard title="Assiduité" value={v(data?.attendanceRate !== undefined ? `${data?.attendanceRate}%` : "—")} icon={UserCheck} sub="taux de présence" />
        </div>
      </section>

      {/* Dernier match */}
      {!loading && (data?.lastMatches?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Derniers matchs
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {data!.lastMatches.map((m, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="py-4 px-5 space-y-2">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">vs {m.opponent}</span>
                    <div className="flex items-center gap-2 text-xl font-bold">
                      <span className={m.homeScore > m.awayScore ? "text-green-600" : "text-red-600"}>
                        {m.homeScore}
                      </span>
                      <span className="text-muted-foreground text-sm">–</span>
                      <span className={m.awayScore > m.homeScore ? "text-green-600" : "text-red-600"}>
                        {m.awayScore}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function KpiCard({ title, value, sub, icon: Icon, accent }: {
  title: string; value: any; sub: string; icon: React.ElementType; accent?: "green" | "red"
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${accent === "green" ? "text-green-600" : accent === "red" ? "text-red-600" : ""}`}>
          {value ?? "—"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

function TopCard({ title, player, label, icon: Icon }: {
  title: string; player: { name: string; avg: number } | null | undefined; label: string; icon: React.ElementType
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-base font-bold leading-tight">{player?.name ?? "—"}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {player ? `${player.avg} ${label}` : "Aucune stat"}
        </p>
      </CardContent>
    </Card>
  )
}