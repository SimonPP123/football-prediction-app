import {
  getStandings,
  getDashboardStats,
  getUpcomingWithFactors,
  getRecentResultsWithAccuracy,
  getBestPerformingFactor,
  getLiveFixtures,
} from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { SummaryStats } from '@/components/dashboard/summary-stats'
import { UpcomingMatchCard } from '@/components/dashboard/upcoming-match-card'
import { ResultAccuracyCard } from '@/components/dashboard/result-accuracy-card'
import { QuickInsights } from '@/components/dashboard/quick-insights'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [stats, upcomingFixtures, standings, recentResults, bestFactor, liveFixtures] = await Promise.all([
    getDashboardStats(),
    getUpcomingWithFactors(6),
    getStandings(),
    getRecentResultsWithAccuracy(5),
    getBestPerformingFactor(),
    getLiveFixtures(),
  ])

  const topStandings = standings.slice(0, 6)

  // Helper to get live status display
  const getLiveStatus = (status: string) => {
    switch (status) {
      case '1H': return '1st Half'
      case '2H': return '2nd Half'
      case 'HT': return 'Half Time'
      case 'ET': return 'Extra Time'
      case 'BT': return 'Break'
      case 'P': return 'Penalties'
      default: return 'Live'
    }
  }

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" subtitle="Premier League 2025-2026" />

      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <SummaryStats stats={stats} />

        {/* Live Matches - Only show if there are live matches */}
        {liveFixtures.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <h2 className="font-semibold text-lg text-red-500">Live Now</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {liveFixtures.length} match{liveFixtures.length > 1 ? 'es' : ''} in progress
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveFixtures.map((fixture: any) => (
                <Link
                  key={fixture.id}
                  href={`/matches/${fixture.id}`}
                  className="bg-card border-2 border-red-500/30 rounded-lg p-4 hover:border-red-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium px-2 py-1 bg-red-500/10 text-red-500 rounded">
                      {getLiveStatus(fixture.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">{fixture.round}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {fixture.home_team?.logo && (
                        <img src={fixture.home_team.logo} alt="" className="w-8 h-8 object-contain" />
                      )}
                      <span className="font-medium truncate">{fixture.home_team?.code || fixture.home_team?.name}</span>
                    </div>
                    <div className="px-4 text-center">
                      <span className="text-2xl font-bold">
                        {fixture.goals_home ?? 0} - {fixture.goals_away ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="font-medium truncate">{fixture.away_team?.code || fixture.away_team?.name}</span>
                      {fixture.away_team?.logo && (
                        <img src={fixture.away_team.logo} alt="" className="w-8 h-8 object-contain" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Matches */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">Upcoming Matches</h2>
                <DataFreshnessBadge category="fixtures" size="sm" showInfo />
              </div>
              <Link href="/predictions" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>

            {upcomingFixtures.length === 0 ? (
              <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
                No upcoming matches scheduled
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingFixtures.map((fixture: any) => (
                  <UpcomingMatchCard
                    key={fixture.id}
                    fixture={fixture}
                    showFactors={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Insights */}
            <QuickInsights
              bestFactor={bestFactor}
              resultAccuracy={stats.resultAccuracy}
              totalAnalyzed={stats.analyzedMatches}
            />

            {/* Mini Standings */}
            <div className="bg-card border rounded-lg">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">League Table</h2>
                  <DataFreshnessBadge category="standings" size="sm" showInfo />
                </div>
                <Link href="/standings" className="text-sm text-primary hover:underline">
                  Full Table
                </Link>
              </div>
              <div className="p-4">
                {topStandings.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    Standings not available
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-xs">
                        <th className="text-left pb-2">#</th>
                        <th className="text-left pb-2">Team</th>
                        <th className="text-center pb-2">P</th>
                        <th className="text-center pb-2">GD</th>
                        <th className="text-center pb-2">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topStandings.map((standing: any) => (
                        <tr key={standing.id} className="border-t border-border/50">
                          <td className="py-2 font-medium">{standing.rank}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              {standing.team?.logo && (
                                <img
                                  src={standing.team.logo}
                                  alt={standing.team.name}
                                  className="w-5 h-5 object-contain"
                                />
                              )}
                              <span className="text-sm truncate max-w-[100px]">
                                {standing.team?.code || standing.team?.name?.slice(0, 3) || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 text-center">{standing.played}</td>
                          <td className="py-2 text-center">
                            <span
                              className={
                                standing.goal_diff > 0
                                  ? 'text-green-500'
                                  : standing.goal_diff < 0
                                  ? 'text-red-500'
                                  : ''
                              }
                            >
                              {standing.goal_diff > 0 ? '+' : ''}
                              {standing.goal_diff}
                            </span>
                          </td>
                          <td className="py-2 text-center font-bold">{standing.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">Recent Results</h2>
              <DataFreshnessBadge category="match-analysis" size="sm" showInfo />
            </div>
            <Link href="/matches" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {recentResults.length === 0 ? (
              <div className="col-span-full bg-card border rounded-lg p-8 text-center text-muted-foreground">
                No recent matches
              </div>
            ) : (
              recentResults.map((match: any) => (
                <ResultAccuracyCard
                  key={match.id}
                  fixture={match}
                  variant="compact"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
