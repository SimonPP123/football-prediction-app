import {
  getStandings,
  getDashboardStats,
  getUpcomingWithFactors,
  getRecentResultsWithAccuracy,
  getBestPerformingFactor,
  getLiveFixturesWithFactors,
} from '@/lib/supabase/queries'
import { getLeagueFromCookies } from '@/lib/league-context'
import { cookies } from 'next/headers'
import { Header } from '@/components/layout/header'
import { SummaryStats } from '@/components/dashboard/summary-stats'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { ResultAccuracyCard } from '@/components/dashboard/result-accuracy-card'
import { QuickInsights } from '@/components/dashboard/quick-insights'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Get league from cookies (set by client-side LeagueProvider)
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const league = await getLeagueFromCookies(cookieHeader)
  const leagueId = league.id || undefined

  const [stats, upcomingFixtures, standings, recentResults, bestFactor, liveFixtures] = await Promise.all([
    getDashboardStats(leagueId),
    getUpcomingWithFactors(6, leagueId),
    getStandings(leagueId),
    getRecentResultsWithAccuracy(5, leagueId),
    getBestPerformingFactor(leagueId),
    getLiveFixturesWithFactors(6, leagueId),
  ])

  const topStandings = standings.slice(0, 6)

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" />

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveFixtures.map((fixture: any) => (
                <PredictionCard
                  key={fixture.id}
                  fixture={fixture}
                  isLive={true}
                />
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
                  <PredictionCard
                    key={fixture.id}
                    fixture={fixture}
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
