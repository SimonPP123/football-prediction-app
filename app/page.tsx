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
import { QuickInsights } from '@/components/dashboard/quick-insights'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import { DashboardLiveResultsWrapper } from '@/components/dashboard/dashboard-live-results-wrapper'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ league_id?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()

  // Priority: URL param > Cookie > Default
  let leagueId: string | undefined
  if (params.league_id) {
    // URL parameter takes priority (e.g., on browser refresh)
    leagueId = params.league_id
  } else {
    // Fall back to cookie (set by client-side LeagueProvider)
    const league = await getLeagueFromCookies(cookieHeader)
    leagueId = league.id || undefined
  }

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

        {/* Live & Results Wrapper - Client component with polling */}
        <DashboardLiveResultsWrapper
          initialLiveFixtures={liveFixtures}
          initialRecentResults={recentResults}
          leagueId={leagueId}
        >

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

        </DashboardLiveResultsWrapper>
      </div>
    </div>
  )
}
