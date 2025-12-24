import { getFixture, getHeadToHead } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

export default async function MatchDetailPage({ params }: PageProps) {
  const fixtureData = await getFixture(params.id)

  if (!fixtureData) {
    notFound()
  }

  // Type assertion for fixture data
  const fixture = fixtureData as any

  const h2hData = fixture.home_team_id && fixture.away_team_id
    ? await getHeadToHead(fixture.home_team_id, fixture.away_team_id)
    : null
  const h2h = h2hData as any

  const isCompleted = ['FT', 'AET', 'PEN'].includes(fixture.status)
  const prediction = fixture.prediction?.[0]

  // Get match statistics
  const stats = fixture.statistics || []
  const homeStats = stats.find((s: any) => s.team_id === fixture.home_team_id)?.statistics || {}
  const awayStats = stats.find((s: any) => s.team_id === fixture.away_team_id)?.statistics || {}

  // Get events
  const events = fixture.events || []
  const goals = events.filter((e: any) => e.type === 'Goal')
  const cards = events.filter((e: any) => e.type === 'Card')

  return (
    <div className="min-h-screen">
      <Header
        title={`${fixture.home_team?.name} vs ${fixture.away_team?.name}`}
        subtitle={fixture.round || 'Premier League'}
      />

      <div className="p-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Matches
        </Link>

        {/* Match Header */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {fixture.venue && (
              <p className="text-sm text-muted-foreground">{fixture.venue.name}</p>
            )}
          </div>

          <div className="flex items-center justify-center gap-8">
            {/* Home Team */}
            <div className="text-center flex-1">
              {fixture.home_team?.logo && (
                <img
                  src={fixture.home_team.logo}
                  alt={fixture.home_team.name}
                  className="w-20 h-20 mx-auto mb-2 object-contain"
                />
              )}
              <h2 className="font-bold text-lg">{fixture.home_team?.name}</h2>
            </div>

            {/* Score / Status */}
            <div className="text-center min-w-[120px]">
              {isCompleted ? (
                <div className="text-4xl font-bold">
                  {fixture.goals_home} - {fixture.goals_away}
                </div>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">
                  vs
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1">
                {fixture.status}
              </div>
              {fixture.score_halftime && (
                <div className="text-xs text-muted-foreground">
                  HT: {fixture.score_halftime.home} - {fixture.score_halftime.away}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="text-center flex-1">
              {fixture.away_team?.logo && (
                <img
                  src={fixture.away_team.logo}
                  alt={fixture.away_team.name}
                  className="w-20 h-20 mx-auto mb-2 object-contain"
                />
              )}
              <h2 className="font-bold text-lg">{fixture.away_team?.name}</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prediction */}
          {prediction && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-4">AI Prediction</h3>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    prediction.prediction_result === '1' ? 'bg-home text-white' :
                    prediction.prediction_result === 'X' ? 'bg-draw text-white' :
                    'bg-away text-white'
                  }`}>
                    {prediction.prediction_result}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {prediction.overall_index}% confidence
                  </p>
                </div>
              </div>

              {prediction.factors && (
                <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Home</p>
                    <p className="font-medium">{prediction.factors.home_win_pct}%</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Draw</p>
                    <p className="font-medium">{prediction.factors.draw_pct}%</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Away</p>
                    <p className="font-medium">{prediction.factors.away_win_pct}%</p>
                  </div>
                </div>
              )}

              {prediction.analysis_text && (
                <p className="text-sm text-muted-foreground">
                  {prediction.analysis_text}
                </p>
              )}
            </div>
          )}

          {/* Head to Head */}
          {h2h && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Head to Head</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-500">{h2h.team1_wins}</p>
                  <p className="text-xs text-muted-foreground">
                    {fixture.home_team?.name} Wins
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{h2h.draws}</p>
                  <p className="text-xs text-muted-foreground">Draws</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{h2h.team2_wins}</p>
                  <p className="text-xs text-muted-foreground">
                    {fixture.away_team?.name} Wins
                  </p>
                </div>
              </div>
              <div className="text-center mt-4 text-sm text-muted-foreground">
                {h2h.matches_played} matches played •
                Goals: {h2h.team1_goals} - {h2h.team2_goals}
              </div>
            </div>
          )}
        </div>

        {/* Match Stats */}
        {isCompleted && Object.keys(homeStats).length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Match Statistics</h3>
            <div className="space-y-3">
              {[
                { key: 'Ball Possession', label: 'Possession' },
                { key: 'Total Shots', label: 'Total Shots' },
                { key: 'Shots on Goal', label: 'Shots on Target' },
                { key: 'Corner Kicks', label: 'Corners' },
                { key: 'Fouls', label: 'Fouls' },
                { key: 'Yellow Cards', label: 'Yellow Cards' },
                { key: 'Passes accurate', label: 'Accurate Passes' },
              ].map(({ key, label }) => {
                const homeVal = homeStats[key] || 0
                const awayVal = awayStats[key] || 0
                const homeNum = parseInt(String(homeVal).replace('%', '')) || 0
                const awayNum = parseInt(String(awayVal).replace('%', '')) || 0
                const total = homeNum + awayNum || 1
                const homeWidth = (homeNum / total) * 100
                const awayWidth = (awayNum / total) * 100

                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{homeVal}</span>
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{awayVal}</span>
                    </div>
                    <div className="flex h-2 rounded overflow-hidden bg-muted">
                      <div
                        className="bg-home"
                        style={{ width: `${homeWidth}%` }}
                      />
                      <div
                        className="bg-away"
                        style={{ width: `${awayWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Match Events</h3>
            <div className="space-y-2">
              {events
                .filter((e: any) => ['Goal', 'Card'].includes(e.type))
                .sort((a: any, b: any) => (a.time_elapsed || 0) - (b.time_elapsed || 0))
                .map((event: any, i: number) => {
                  const isHome = event.team_id === fixture.home_team_id
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 ${isHome ? '' : 'flex-row-reverse'}`}
                    >
                      <span className="text-sm text-muted-foreground w-10">
                        {event.time_elapsed}'
                      </span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        event.type === 'Goal' ? 'bg-green-500 text-white' :
                        event.detail === 'Yellow Card' ? 'bg-yellow-500' :
                        'bg-red-500 text-white'
                      }`}>
                        {event.type === 'Goal' ? '⚽' : '🟨'}
                      </span>
                      <span className="text-sm font-medium">{event.player_name}</span>
                      {event.assist_name && (
                        <span className="text-xs text-muted-foreground">
                          (assist: {event.assist_name})
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
