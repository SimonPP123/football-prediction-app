import { getCompletedFixtures, getUpcomingFixtures } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import Link from 'next/link'

export default async function MatchesPage() {
  const [completed, upcoming] = await Promise.all([
    getCompletedFixtures(50),
    getUpcomingFixtures(20),
  ])

  return (
    <div className="min-h-screen">
      <Header title="Matches" />

      <div className="p-6 space-y-6">
        {/* Upcoming Matches */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Upcoming Matches</h2>
          </div>
          <div className="divide-y divide-border">
            {upcoming.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No upcoming matches
              </div>
            ) : (
              upcoming.map((fixture: any) => (
                <Link
                  key={fixture.id}
                  href={`/matches/${fixture.id}`}
                  className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors block"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Date */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs text-muted-foreground">
                        {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-sm font-medium">
                        {new Date(fixture.match_date).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Home Team */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="font-medium text-right">
                        {fixture.home_team?.name || 'TBD'}
                      </span>
                      {fixture.home_team?.logo && (
                        <img
                          src={fixture.home_team.logo}
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
                      )}
                    </div>

                    {/* VS */}
                    <div className="px-4 py-1 bg-muted rounded text-sm font-medium min-w-[50px] text-center">
                      vs
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-2 flex-1">
                      {fixture.away_team?.logo && (
                        <img
                          src={fixture.away_team.logo}
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <span className="font-medium">
                        {fixture.away_team?.name || 'TBD'}
                      </span>
                    </div>
                  </div>

                  {/* Round */}
                  <div className="text-xs text-muted-foreground ml-4">
                    {fixture.round}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Completed Matches */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Results</h2>
          </div>
          <div className="divide-y divide-border">
            {completed.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No completed matches
              </div>
            ) : (
              completed.map((fixture: any) => (
                <Link
                  key={fixture.id}
                  href={`/matches/${fixture.id}`}
                  className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors block"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Date */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs text-muted-foreground">
                        {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </div>

                    {/* Home Team */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className={`font-medium text-right ${
                        (fixture.goals_home ?? 0) > (fixture.goals_away ?? 0) ? '' : 'text-muted-foreground'
                      }`}>
                        {fixture.home_team?.name || 'TBD'}
                      </span>
                      {fixture.home_team?.logo && (
                        <img
                          src={fixture.home_team.logo}
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
                      )}
                    </div>

                    {/* Score */}
                    <div className="px-4 py-1 bg-muted rounded text-sm font-bold min-w-[60px] text-center">
                      {fixture.goals_home} - {fixture.goals_away}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center gap-2 flex-1">
                      {fixture.away_team?.logo && (
                        <img
                          src={fixture.away_team.logo}
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
                      )}
                      <span className={`font-medium ${
                        (fixture.goals_away ?? 0) > (fixture.goals_home ?? 0) ? '' : 'text-muted-foreground'
                      }`}>
                        {fixture.away_team?.name || 'TBD'}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="text-xs text-muted-foreground ml-4">
                    {fixture.status}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
