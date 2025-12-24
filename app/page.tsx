import { getUpcomingFixtures, getStandings, getCompletedFixtures } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import Link from 'next/link'

export default async function DashboardPage() {
  const [upcomingFixtures, standings, recentMatches] = await Promise.all([
    getUpcomingFixtures(6),
    getStandings(),
    getCompletedFixtures(5),
  ])

  const topStandings = standings.slice(0, 6)

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" subtitle="Premier League 2025-2026" />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Upcoming Matches</p>
            <p className="text-2xl font-bold">{upcomingFixtures.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Matches Played</p>
            <p className="text-2xl font-bold">{recentMatches.length > 0 ? '170+' : '0'}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Teams</p>
            <p className="text-2xl font-bold">20</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Season</p>
            <p className="text-2xl font-bold">2025-26</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Matches */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold">Upcoming Matches</h2>
              <Link href="/predictions" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="divide-y divide-border">
              {upcomingFixtures.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No upcoming matches scheduled
                </div>
              ) : (
                upcomingFixtures.map((fixture: any) => (
                  <div key={fixture.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="font-medium text-right">
                            {fixture.home_team?.name || 'TBD'}
                          </span>
                          {fixture.home_team?.logo && (
                            <img
                              src={fixture.home_team.logo}
                              alt={fixture.home_team.name}
                              className="w-8 h-8 object-contain"
                            />
                          )}
                        </div>

                        {/* VS / Score */}
                        <div className="px-4 py-1 bg-muted rounded text-sm font-medium min-w-[60px] text-center">
                          {fixture.prediction?.[0]?.prediction_result || 'vs'}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2 flex-1">
                          {fixture.away_team?.logo && (
                            <img
                              src={fixture.away_team.logo}
                              alt={fixture.away_team.name}
                              className="w-8 h-8 object-contain"
                            />
                          )}
                          <span className="font-medium">
                            {fixture.away_team?.name || 'TBD'}
                          </span>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-sm text-muted-foreground ml-4">
                        {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {fixture.round && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fixture.round}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mini Standings */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold">League Table</h2>
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
                            <span className="truncate max-w-[100px]">
                              {standing.team?.name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-center">{standing.played}</td>
                        <td className="py-2 text-center">
                          <span className={standing.goal_diff > 0 ? 'text-green-500' : standing.goal_diff < 0 ? 'text-red-500' : ''}>
                            {standing.goal_diff > 0 ? '+' : ''}{standing.goal_diff}
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

        {/* Recent Results */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold">Recent Results</h2>
            <Link href="/matches" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
            {recentMatches.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-4">
                No recent matches
              </div>
            ) : (
              recentMatches.map((match: any) => (
                <div key={match.id} className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-2">
                    {new Date(match.match_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {match.home_team?.logo && (
                      <img src={match.home_team.logo} alt="" className="w-6 h-6" />
                    )}
                    <span className="font-bold">
                      {match.goals_home} - {match.goals_away}
                    </span>
                    {match.away_team?.logo && (
                      <img src={match.away_team.logo} alt="" className="w-6 h-6" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {match.home_team?.code || match.home_team?.name?.slice(0, 3)} vs {match.away_team?.code || match.away_team?.name?.slice(0, 3)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
