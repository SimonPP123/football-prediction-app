import { getTeam, getTeamSeasonStats, getTeamForm, getTeamInjuries } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import { supabase } from '@/lib/supabase/client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

async function getTeamFixtures(teamId: string, limit = 10) {
  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      *,
      home_team:teams!fixtures_home_team_id_fkey(*),
      away_team:teams!fixtures_away_team_id_fkey(*)
    `)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .in('status', ['FT', 'AET', 'PEN'])
    .order('match_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

async function getTeamSquad(teamId: string) {
  const { data, error } = await supabase
    .from('player_squads')
    .select(`
      *,
      player:players(*)
    `)
    .eq('team_id', teamId)
    .eq('season', 2025)

  if (error) throw error
  return data || []
}

export default async function TeamDetailPage({ params }: PageProps) {
  const [teamData, statsData, form, injuries, recentMatches, squad] = await Promise.all([
    getTeam(params.id),
    getTeamSeasonStats(params.id),
    getTeamForm(params.id, 10),
    getTeamInjuries(params.id),
    getTeamFixtures(params.id, 10),
    getTeamSquad(params.id),
  ])

  if (!teamData) {
    notFound()
  }

  // Type assertions for data
  const team = teamData as any
  const stats = statsData as any

  const formString = form.join('')

  return (
    <div className="min-h-screen">
      <Header title={team.name} subtitle="Team Profile" />

      <div className="p-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>

        {/* Team Header */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-6">
            {team.logo && (
              <img
                src={team.logo}
                alt={team.name}
                className="w-24 h-24 object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              {team.code && <p className="text-muted-foreground">{team.code}</p>}

              {/* Form */}
              {formString && (
                <div className="flex gap-1 mt-3">
                  {formString.split('').map((result, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        result === 'W' ? 'bg-green-500' :
                        result === 'D' ? 'bg-gray-500' :
                        result === 'L' ? 'bg-red-500' : 'bg-muted'
                      }`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            {stats && (
              <div className="ml-auto grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.wins}</p>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.draws}</p>
                  <p className="text-xs text-muted-foreground">Draws</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.losses}</p>
                  <p className="text-xs text-muted-foreground">Losses</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Info */}
          <div className="space-y-6">
            {/* Venue */}
            {team.venue && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Stadium</h3>
                <p className="font-medium">{team.venue.name}</p>
                {team.venue.city && (
                  <p className="text-sm text-muted-foreground">{team.venue.city}</p>
                )}
                {team.venue.capacity && (
                  <p className="text-sm text-muted-foreground">
                    Capacity: {team.venue.capacity.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Coach */}
            {team.coach && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Coach</h3>
                <div className="flex items-center gap-3">
                  {team.coach.photo && (
                    <img
                      src={team.coach.photo}
                      alt={team.coach.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <p className="font-medium">{team.coach.name}</p>
                </div>
              </div>
            )}

            {/* Season Stats */}
            {stats && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Season Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Played</span>
                    <span className="font-medium">{stats.fixtures_played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goals For</span>
                    <span className="font-medium text-green-500">{stats.goals_for}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goals Against</span>
                    <span className="font-medium text-red-500">{stats.goals_against}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goal Diff</span>
                    <span className={`font-medium ${(stats.goals_for - stats.goals_against) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(stats.goals_for - stats.goals_against) >= 0 ? '+' : ''}{stats.goals_for - stats.goals_against}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Injuries */}
            {injuries.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Injuries</h3>
                <div className="space-y-2">
                  {injuries.slice(0, 5).map((injury: any) => (
                    <div key={injury.id} className="flex justify-between text-sm">
                      <span>{injury.player_name}</span>
                      <span className="text-red-500">{injury.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Matches */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Recent Matches</h3>
            </div>
            <div className="divide-y divide-border">
              {recentMatches.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No recent matches
                </div>
              ) : (
                recentMatches.map((match: any) => {
                  const isHome = match.home_team_id === params.id
                  const teamGoals = isHome ? match.goals_home : match.goals_away
                  const oppGoals = isHome ? match.goals_away : match.goals_home
                  const opponent = isHome ? match.away_team : match.home_team
                  const result = teamGoals > oppGoals ? 'W' : teamGoals < oppGoals ? 'L' : 'D'

                  return (
                    <div key={match.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            result === 'W' ? 'bg-green-500' :
                            result === 'D' ? 'bg-gray-500' : 'bg-red-500'
                          }`}
                        >
                          {result}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isHome ? 'H' : 'A'}
                        </span>
                        {opponent?.logo && (
                          <img src={opponent.logo} alt="" className="w-5 h-5" />
                        )}
                        <span className="text-sm">{opponent?.name}</span>
                      </div>
                      <div className="font-medium">
                        {teamGoals} - {oppGoals}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Squad */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Squad ({squad.length})</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <div className="divide-y divide-border">
                {squad.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Squad not available
                  </div>
                ) : (
                  squad.map((ps: any) => (
                    <div key={ps.id} className="p-3 flex items-center gap-3">
                      {ps.player?.photo && (
                        <img
                          src={ps.player.photo}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ps.player?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ps.position} {ps.number ? `#${ps.number}` : ''}
                        </p>
                      </div>
                      {ps.player?.injured && (
                        <span className="text-xs text-red-500">Injured</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
