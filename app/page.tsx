import {
  getStandings,
  getDashboardStats,
  getUpcomingWithFactors,
  getRecentResultsWithAccuracy,
  getBestPerformingFactor,
  getLiveFixturesWithFactors,
} from '@/lib/supabase/queries'
import { getLeagueFromCookies, getLeagueById } from '@/lib/league-context'
import { cookies } from 'next/headers'
import { Header } from '@/components/layout/header'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { DashboardUpcomingAndSidebar } from '@/components/dashboard/dashboard-upcoming-sidebar'
import { DashboardLiveResultsWrapper } from '@/components/dashboard/dashboard-live-results-wrapper'

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
  let currentSeason: number | undefined

  if (params.league_id) {
    // URL parameter takes priority (e.g., on browser refresh)
    leagueId = params.league_id
    // Fetch league config to get season
    const league = await getLeagueById(params.league_id)
    currentSeason = league?.currentSeason
  } else {
    // Fall back to cookie (set by client-side LeagueProvider)
    const league = await getLeagueFromCookies(cookieHeader)
    leagueId = league.id || undefined
    currentSeason = league.currentSeason
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
        {/* Summary Stats - Client component that refetches on league change */}
        <DashboardStats
          initialStats={stats}
          initialSeason={currentSeason}
        />

        {/* Live & Results Wrapper - Client component with polling */}
        <DashboardLiveResultsWrapper
          initialLiveFixtures={liveFixtures}
          initialRecentResults={recentResults}
          leagueId={leagueId}
        >
          {/* Upcoming Matches + Sidebar - Client component that refetches on league change */}
          <DashboardUpcomingAndSidebar
            initialUpcomingFixtures={upcomingFixtures}
            initialTopStandings={topStandings}
            initialBestFactor={bestFactor}
            initialResultAccuracy={stats.resultAccuracy}
            initialAnalyzedMatches={stats.analyzedMatches}
          />
        </DashboardLiveResultsWrapper>
      </div>
    </div>
  )
}
