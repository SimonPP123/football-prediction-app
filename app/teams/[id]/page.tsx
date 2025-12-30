'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { TeamStatsDashboard } from '@/components/teams/team-stats-dashboard'
import { SquadTable } from '@/components/teams/squad-table'
import { InjuryList } from '@/components/teams/injury-list'
import { FormIndicator } from '@/components/stats/form-indicator'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import { MatchHeader } from '@/components/matches/match-header'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Users,
  Trophy,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react'

type TabType = 'overview' | 'squad' | 'matches' | 'predictions'

export default function TeamDetailPage() {
  const params = useParams()
  const [team, setTeam] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [standings, setStandings] = useState<any>(null)
  const [injuries, setInjuries] = useState<any[]>([])
  const [recentMatches, setRecentMatches] = useState<any[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([])
  const [squad, setSquad] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel any pending request when team changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    fetchTeamData(abortControllerRef.current.signal)

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [params.id])

  const fetchTeamData = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const teamId = params.id as string

      // Fetch all team data in parallel
      const [teamRes, standingsRes, injuriesRes] = await Promise.all([
        fetch(`/api/teams/${teamId}`, { credentials: 'include', signal }),
        fetch('/api/standings', { credentials: 'include', signal }),
        fetch(`/api/injuries?team_id=${teamId}`, { credentials: 'include', signal }),
      ])

      if (signal?.aborted) return

      const teamData = await teamRes.json()
      const standingsData = await standingsRes.json()
      const injuriesData = await injuriesRes.json()

      if (signal?.aborted) return

      setTeam(teamData)
      setStats(teamData.season_stats?.[0] || null)

      // Find this team's standing
      const teamStanding = standingsData.find((s: any) => s.team_id === teamId)
      setStandings(teamStanding)

      // Set injuries (already filtered by team_id from API)
      setInjuries(injuriesData)

      // Get squad
      if (teamData.squad) {
        setSquad(teamData.squad)
      }

      // Get recent matches
      if (teamData.recent_matches) {
        setRecentMatches(teamData.recent_matches)
      }

      // Get upcoming matches
      if (teamData.upcoming_matches) {
        setUpcomingMatches(teamData.upcoming_matches)
      }

      // Get predictions for this team
      if (teamData.predictions) {
        setPredictions(teamData.predictions)
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Failed to fetch team data:', error)
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Team Details" subtitle="Loading..." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen">
        <Header title="Team Details" subtitle="Not Found" />
        <div className="p-6 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Team not found</p>
          <Link href="/teams" className="text-primary hover:underline mt-4 inline-block">
            Back to Teams
          </Link>
        </div>
      </div>
    )
  }

  // Calculate form from standings
  const formString = standings?.form || ''

  // Get prediction accuracy for this team
  const teamPredictions = predictions.filter((p: any) =>
    p.fixture?.home_team_id === params.id || p.fixture?.away_team_id === params.id
  )
  const completedPredictions = teamPredictions.filter((p: any) =>
    ['FT', 'AET', 'PEN'].includes(p.fixture?.status)
  )
  const correctPredictions = completedPredictions.filter((p: any) => {
    const actual = p.fixture?.goals_home > p.fixture?.goals_away ? '1' :
                   p.fixture?.goals_home < p.fixture?.goals_away ? '2' : 'X'
    return p.prediction_result === actual
  })
  const predictionAccuracy = completedPredictions.length > 0
    ? ((correctPredictions.length / completedPredictions.length) * 100).toFixed(0)
    : null

  const tabs: { id: TabType; label: string; icon: typeof Trophy }[] = [
    { id: 'overview', label: 'Overview', icon: Trophy },
    { id: 'squad', label: 'Squad', icon: Users },
    { id: 'matches', label: 'Matches', icon: Calendar },
    { id: 'predictions', label: 'Predictions', icon: Target },
  ]

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

        {/* Data freshness */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Data:</span>
          <DataFreshnessBadge category="standings" size="sm" showInfo />
          <DataFreshnessBadge category="injuries" size="sm" showInfo />
          <DataFreshnessBadge category="team-stats" size="sm" showInfo />
        </div>

        {/* Team Header */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {team.logo && (
              <img
                src={team.logo}
                alt={team.name}
                className="w-24 h-24 object-contain mx-auto md:mx-0"
              />
            )}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold">{team.name}</h1>
              {team.code && <p className="text-muted-foreground">{team.code}</p>}

              {/* Position and Points */}
              {standings && (
                <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                    #{standings.rank}
                  </span>
                  <span className="text-lg font-medium">
                    {standings.points} points
                  </span>
                </div>
              )}

              {/* Form */}
              {formString && (
                <div className="mt-3 flex justify-center md:justify-start">
                  <FormIndicator form={formString} size="md" maxResults={10} />
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">{standings?.won || 0}</p>
                <p className="text-xs text-muted-foreground">Wins</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{standings?.drawn || 0}</p>
                <p className="text-xs text-muted-foreground">Draws</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{standings?.lost || 0}</p>
                <p className="text-xs text-muted-foreground">Losses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Dashboard - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-lg p-4 md:p-6">
                <h3 className="font-semibold mb-4">Season Statistics</h3>
                <TeamStatsDashboard stats={stats} />
              </div>

              {/* Recent Results */}
              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold">Recent Results</h3>
                  {predictionAccuracy && (
                    <span className={cn(
                      "text-xs px-2 py-1 rounded",
                      Number(predictionAccuracy) >= 60 ? "bg-green-500/10 text-green-600" :
                      Number(predictionAccuracy) >= 40 ? "bg-amber-500/10 text-amber-600" :
                      "bg-red-500/10 text-red-600"
                    )}>
                      {predictionAccuracy}% prediction accuracy
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {recentMatches.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No recent matches</p>
                    </div>
                  ) : (
                    recentMatches.slice(0, 5).map((match: any) => {
                      const isHome = match.home_team_id === params.id
                      const teamGoals = isHome ? match.goals_home : match.goals_away
                      const oppGoals = isHome ? match.goals_away : match.goals_home
                      const opponent = isHome ? match.away_team : match.home_team
                      const result = teamGoals > oppGoals ? 'W' : teamGoals < oppGoals ? 'L' : 'D'

                      return (
                        <Link
                          key={match.id}
                          href={`/matches/${match.id}`}
                          className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                              result === 'W' ? 'bg-green-500' :
                              result === 'D' ? 'bg-gray-500' : 'bg-red-500'
                            )}>
                              {result}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {isHome ? 'H' : 'A'}
                            </span>
                            {opponent?.logo && (
                              <img src={opponent.logo} alt="" className="w-6 h-6 object-contain" />
                            )}
                            <span className="text-sm font-medium">{opponent?.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{teamGoals} - {oppGoals}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(match.match_date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </p>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Venue */}
              {team.venue && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Stadium
                  </h3>
                  <p className="font-medium">{team.venue.name}</p>
                  {team.venue.city && (
                    <p className="text-sm text-muted-foreground">{team.venue.city}</p>
                  )}
                  {team.venue.capacity && (
                    <p className="text-sm text-muted-foreground">
                      Capacity: {team.venue.capacity.toLocaleString()}
                    </p>
                  )}
                  {team.venue.surface && (
                    <p className="text-sm text-muted-foreground capitalize">
                      Surface: {team.venue.surface}
                    </p>
                  )}
                </div>
              )}

              {/* Coach */}
              {team.coach && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Manager</h3>
                  <div className="flex items-center gap-3">
                    {team.coach.photo && (
                      <img
                        src={team.coach.photo}
                        alt={team.coach.name}
                        className="w-12 h-12 rounded-full object-cover border border-border"
                      />
                    )}
                    <div>
                      <p className="font-medium">{team.coach.name}</p>
                      {team.coach.nationality && (
                        <p className="text-xs text-muted-foreground">{team.coach.nationality}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Injuries */}
              <div className="bg-card border border-border rounded-lg p-4">
                <InjuryList injuries={injuries} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'squad' && (
          <div className="bg-card border border-border rounded-lg p-4 md:p-6">
            <h3 className="font-semibold mb-4">Squad ({squad.length} players)</h3>
            <SquadTable squad={squad} injuries={injuries} />
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Matches */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Upcoming Matches</h3>
              </div>
              <div className="divide-y divide-border">
                {upcomingMatches.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No upcoming matches scheduled</p>
                  </div>
                ) : (
                  upcomingMatches.slice(0, 5).map((match: any) => {
                    const isHome = match.home_team_id === params.id
                    const opponent = isHome ? match.away_team : match.home_team

                    return (
                      <Link
                        key={match.id}
                        href={`/matches/${match.id}`}
                        className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            isHome ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                          )}>
                            {isHome ? 'HOME' : 'AWAY'}
                          </span>
                          {opponent?.logo && (
                            <img src={opponent.logo} alt="" className="w-6 h-6 object-contain" />
                          )}
                          <span className="text-sm font-medium">{opponent?.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(match.match_date).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(match.match_date).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Recent Results</h3>
              </div>
              <div className="divide-y divide-border">
                {recentMatches.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent matches</p>
                  </div>
                ) : (
                  recentMatches.slice(0, 10).map((match: any) => {
                    const isHome = match.home_team_id === params.id
                    const teamGoals = isHome ? match.goals_home : match.goals_away
                    const oppGoals = isHome ? match.goals_away : match.goals_home
                    const opponent = isHome ? match.away_team : match.home_team
                    const result = teamGoals > oppGoals ? 'W' : teamGoals < oppGoals ? 'L' : 'D'

                    return (
                      <Link
                        key={match.id}
                        href={`/matches/${match.id}`}
                        className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                            result === 'W' ? 'bg-green-500' :
                            result === 'D' ? 'bg-gray-500' : 'bg-red-500'
                          )}>
                            {result}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isHome ? 'H' : 'A'}
                          </span>
                          {opponent?.logo && (
                            <img src={opponent.logo} alt="" className="w-6 h-6 object-contain" />
                          )}
                          <span className="text-sm">{opponent?.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{teamGoals} - {oppGoals}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(match.match_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="bg-card border border-border rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Prediction Accuracy</h3>
              {predictionAccuracy && (
                <div className={cn(
                  "text-lg font-bold px-3 py-1 rounded-lg",
                  Number(predictionAccuracy) >= 60 ? "bg-green-500/10 text-green-600" :
                  Number(predictionAccuracy) >= 40 ? "bg-amber-500/10 text-amber-600" :
                  "bg-red-500/10 text-red-600"
                )}>
                  {predictionAccuracy}%
                </div>
              )}
            </div>

            {completedPredictions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No completed predictions for this team yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-2xl font-bold">{completedPredictions.length}</p>
                    <p className="text-xs text-muted-foreground">Total Predictions</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4">
                    <p className="text-2xl font-bold text-green-600">{correctPredictions.length}</p>
                    <p className="text-xs text-muted-foreground">Correct</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-4">
                    <p className="text-2xl font-bold text-red-600">
                      {completedPredictions.length - correctPredictions.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Incorrect</p>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {completedPredictions.slice(0, 10).map((prediction: any) => {
                    const match = prediction.fixture
                    const isHome = match?.home_team_id === params.id
                    const actual = match?.goals_home > match?.goals_away ? '1' :
                                   match?.goals_home < match?.goals_away ? '2' : 'X'
                    const isCorrect = prediction.prediction_result === actual

                    return (
                      <Link
                        key={prediction.id}
                        href={`/matches/${match?.id}`}
                        className="py-3 flex items-center justify-between hover:bg-muted/30 transition-colors px-2 rounded"
                      >
                        <div className="flex items-center gap-3">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {match?.home_team?.name} vs {match?.away_team?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(match?.match_date).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Predicted:</span>{' '}
                            <span className="font-medium">{prediction.prediction_result}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Actual:</span>{' '}
                            <span className="font-medium">{match?.goals_home} - {match?.goals_away}</span>
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
