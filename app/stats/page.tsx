'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/stats/stat-card'
import { useLeague } from '@/contexts/league-context'
import { useDataStatus } from '@/hooks/use-data-status'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Users,
  Trophy,
  Target,
  Shield,
  TrendingUp,
  TrendingDown,
  Award,
  Home,
  Plane,
  CheckCircle,
  XCircle,
  BarChart3,
  Crosshair,
  AlertTriangle,
  Clock,
} from 'lucide-react'

type TabType = 'players' | 'teams' | 'predictions'
type PlayerStatType = 'goals' | 'assists' | 'yellow_cards' | 'red_cards'

// Helper to format relative time from ISO string
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getFreshnessColor(dateString: string | null): string {
  if (!dateString) return 'text-muted-foreground bg-muted'
  const date = new Date(dateString)
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / 3600000

  if (diffHours < 1) return 'text-green-600 bg-green-500/10'
  if (diffHours < 4) return 'text-amber-600 bg-amber-500/10'
  if (diffHours < 24) return 'text-orange-600 bg-orange-500/10'
  return 'text-red-600 bg-red-500/10'
}

export default function StatsPage() {
  const { currentLeague } = useLeague()
  const { status: dataStatus } = useDataStatus(currentLeague?.id)
  const [activeTab, setActiveTab] = useState<TabType>('players')
  const [playerStatType, setPlayerStatType] = useState<PlayerStatType>('goals')
  const [loading, setLoading] = useState(true)
  const [playerStats, setPlayerStats] = useState<any[]>([])
  const [teamStats, setTeamStats] = useState<any[]>([])
  const [standings, setStandings] = useState<any[]>([])
  const [predictionStats, setPredictionStats] = useState<any>(null)

  // Get last refresh times from server data
  const getLastRefresh = (name: string): string | null => {
    return dataStatus?.dataSources?.find(ds => ds.name === name)?.lastRefresh || null
  }

  useEffect(() => {
    fetchData()
  }, [currentLeague?.id])

  useEffect(() => {
    if (activeTab === 'players') {
      fetchPlayerStats(playerStatType)
    }
  }, [playerStatType, currentLeague?.id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = currentLeague?.id ? `?league_id=${currentLeague.id}` : ''
      const [standingsRes, accuracyRes] = await Promise.all([
        fetch(`/api/standings${params}`, { credentials: 'include' }),
        fetch(`/api/accuracy-stats${params}`, { credentials: 'include' }),
      ])

      const standingsData = await standingsRes.json()
      const accuracyData = await accuracyRes.json()

      setStandings(standingsData)
      setPredictionStats(accuracyData)

      // Fetch initial player stats
      await fetchPlayerStats('goals')
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayerStats = async (statType: PlayerStatType) => {
    try {
      const params = currentLeague?.id ? `&league_id=${currentLeague.id}` : ''
      const res = await fetch(`/api/stats/players?type=${statType}${params}`, { credentials: 'include' })
      const data = await res.json()
      setPlayerStats(data)
    } catch (error) {
      console.error('Failed to fetch player stats:', error)
    }
  }

  // Memoize sorted standings for team stats to avoid recalculating on every render
  const topScorers = useMemo(() =>
    [...standings].sort((a, b) => (b.goals_for || 0) - (a.goals_for || 0)),
    [standings]
  )
  const bestDefense = useMemo(() =>
    [...standings].sort((a, b) => (a.goals_against || 0) - (b.goals_against || 0)),
    [standings]
  )
  const bestHomeForm = useMemo(() =>
    [...standings]
      .filter(s => s.home_record)
      .sort((a, b) => {
        const aPts = (a.home_record?.win || 0) * 3 + (a.home_record?.draw || 0)
        const bPts = (b.home_record?.win || 0) * 3 + (b.home_record?.draw || 0)
        return bPts - aPts
      }),
    [standings]
  )
  const bestAwayForm = useMemo(() =>
    [...standings]
      .filter(s => s.away_record)
      .sort((a, b) => {
        const aPts = (a.away_record?.win || 0) * 3 + (a.away_record?.draw || 0)
        const bPts = (b.away_record?.win || 0) * 3 + (b.away_record?.draw || 0)
        return bPts - aPts
      }),
    [standings]
  )
  const bestGoalDiff = useMemo(() =>
    [...standings].sort((a, b) => (b.goal_diff || 0) - (a.goal_diff || 0)),
    [standings]
  )

  const tabs: { id: TabType; label: string; icon: typeof Users }[] = [
    { id: 'players', label: 'Players', icon: Users },
    { id: 'teams', label: 'Teams', icon: Trophy },
    { id: 'predictions', label: 'Predictions', icon: Target },
  ]

  const playerStatOptions: { value: PlayerStatType; label: string; color: string }[] = [
    { value: 'goals', label: 'Goals', color: 'text-green-500' },
    { value: 'assists', label: 'Assists', color: 'text-blue-500' },
    { value: 'yellow_cards', label: 'Yellow Cards', color: 'text-yellow-500' },
    { value: 'red_cards', label: 'Red Cards', color: 'text-red-500' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Statistics" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header title="Statistics" />

      <div className="p-6 space-y-6">
        {/* Data freshness - using server-side data */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="text-muted-foreground">Data:</span>
          <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", getFreshnessColor(getLastRefresh('player-stats')))}>
            <Clock className="w-3 h-3" />
            <span>Players: {formatRelativeTime(getLastRefresh('player-stats'))}</span>
          </div>
          <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", getFreshnessColor(getLastRefresh('standings')))}>
            <Clock className="w-3 h-3" />
            <span>Standings: {formatRelativeTime(getLastRefresh('standings'))}</span>
          </div>
          <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", getFreshnessColor(getLastRefresh('predictions')))}>
            <Clock className="w-3 h-3" />
            <span>Predictions: {formatRelativeTime(getLastRefresh('predictions'))}</span>
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

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            {/* Stat type selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {playerStatOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPlayerStatType(option.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                    playerStatType === option.value
                      ? `bg-muted ${option.color}`
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Player stats table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">
                  Top {playerStatType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h2>
              </div>
              <div className="divide-y divide-border">
                {playerStats.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No data available</p>
                  </div>
                ) : (
                  playerStats.map((player: any, idx: number) => (
                    <div key={player.id || idx} className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                      <span className="w-8 text-sm font-bold text-muted-foreground text-center">
                        {idx + 1}
                      </span>
                      {player.player_photo ? (
                        <img
                          src={player.player_photo}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{player.player_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {player.team_logo && (
                            <img src={player.team_logo} alt="" className="w-4 h-4" />
                          )}
                          <span className="truncate">{player.team_name}</span>
                          {player.appearances && (
                            <span className="shrink-0">• {player.appearances} apps</span>
                          )}
                        </div>
                      </div>
                      <div className={cn(
                        "text-xl font-bold",
                        playerStatOptions.find(o => o.value === playerStatType)?.color
                      )}>
                        {player.value}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Scorers (Teams) */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Target className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold">Top Scoring Teams</h2>
              </div>
              <div className="divide-y divide-border">
                {topScorers.slice(0, 10).map((team: any, idx: number) => (
                  <div key={team.id} className="p-3 flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-muted-foreground">{idx + 1}</span>
                    {team.team?.logo && (
                      <img src={team.team.logo} alt="" className="w-8 h-8 object-contain" />
                    )}
                    <span className="flex-1 font-medium truncate">{team.team?.name}</span>
                    <span className="text-xl font-bold text-green-500">{team.goals_for}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Defense */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold">Best Defense</h2>
              </div>
              <div className="divide-y divide-border">
                {bestDefense.slice(0, 10).map((team: any, idx: number) => (
                  <div key={team.id} className="p-3 flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-muted-foreground">{idx + 1}</span>
                    {team.team?.logo && (
                      <img src={team.team.logo} alt="" className="w-8 h-8 object-contain" />
                    )}
                    <span className="flex-1 font-medium truncate">{team.team?.name}</span>
                    <span className="text-xl font-bold text-blue-500">{team.goals_against}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Home Form */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Home className="w-4 h-4 text-green-500" />
                <h2 className="font-semibold">Best Home Form</h2>
              </div>
              <div className="divide-y divide-border">
                {bestHomeForm.slice(0, 10).map((team: any, idx: number) => {
                  const pts = (team.home_record?.win || 0) * 3 + (team.home_record?.draw || 0)
                  return (
                    <div key={team.id} className="p-3 flex items-center gap-3">
                      <span className="w-6 text-sm font-bold text-muted-foreground">{idx + 1}</span>
                      {team.team?.logo && (
                        <img src={team.team.logo} alt="" className="w-8 h-8 object-contain" />
                      )}
                      <span className="flex-1 font-medium truncate">{team.team?.name}</span>
                      <div className="text-right">
                        <span className="text-lg font-bold">{pts} pts</span>
                        <p className="text-xs text-muted-foreground">
                          {team.home_record?.win || 0}W-{team.home_record?.draw || 0}D-{team.home_record?.lose || 0}L
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Best Away Form */}
            <div className="bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <Plane className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold">Best Away Form</h2>
              </div>
              <div className="divide-y divide-border">
                {bestAwayForm.slice(0, 10).map((team: any, idx: number) => {
                  const pts = (team.away_record?.win || 0) * 3 + (team.away_record?.draw || 0)
                  return (
                    <div key={team.id} className="p-3 flex items-center gap-3">
                      <span className="w-6 text-sm font-bold text-muted-foreground">{idx + 1}</span>
                      {team.team?.logo && (
                        <img src={team.team.logo} alt="" className="w-8 h-8 object-contain" />
                      )}
                      <span className="flex-1 font-medium truncate">{team.team?.name}</span>
                      <div className="text-right">
                        <span className="text-lg font-bold">{pts} pts</span>
                        <p className="text-xs text-muted-foreground">
                          {team.away_record?.win || 0}W-{team.away_record?.draw || 0}D-{team.away_record?.lose || 0}L
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Goal Difference */}
            <div className="lg:col-span-2 bg-card border border-border rounded-lg">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Goal Difference</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {bestGoalDiff.slice(0, 10).map((team: any, idx: number) => (
                    <div key={team.id} className="text-center p-3 bg-muted/30 rounded-lg">
                      {team.team?.logo && (
                        <img src={team.team.logo} alt="" className="w-10 h-10 object-contain mx-auto mb-2" />
                      )}
                      <p className="text-sm font-medium truncate">{team.team?.name}</p>
                      <p className={cn(
                        "text-xl font-bold",
                        team.goal_diff > 0 ? "text-green-500" : team.goal_diff < 0 ? "text-red-500" : ""
                      )}>
                        {team.goal_diff > 0 ? '+' : ''}{team.goal_diff}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {team.goals_for} scored / {team.goals_against} conceded
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <div className="space-y-6">
            {/* Summary Stats */}
            {predictionStats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Predictions"
                    value={predictionStats.total || 0}
                    icon={Target}
                  />
                  <StatCard
                    label="Correct"
                    value={predictionStats.correct || 0}
                    icon={CheckCircle}
                    color="green"
                  />
                  <StatCard
                    label="Incorrect"
                    value={predictionStats.incorrect || 0}
                    icon={XCircle}
                    color="red"
                  />
                  <StatCard
                    label="Accuracy"
                    value={`${predictionStats.accuracy?.toFixed(1) || 0}%`}
                    icon={BarChart3}
                    color={
                      predictionStats.accuracy >= 60 ? 'green' :
                      predictionStats.accuracy >= 40 ? 'amber' : 'red'
                    }
                  />
                </div>

                {/* Accuracy by outcome */}
                {predictionStats.byOutcome && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Accuracy by Predicted Outcome</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-home/10 rounded-lg">
                        <p className="text-3xl font-bold text-home">
                          {predictionStats.byOutcome.home?.accuracy?.toFixed(0) || 0}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Home Wins (1)</p>
                        <p className="text-xs text-muted-foreground">
                          {predictionStats.byOutcome.home?.correct || 0}/{predictionStats.byOutcome.home?.total || 0}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-draw/10 rounded-lg">
                        <p className="text-3xl font-bold text-draw">
                          {predictionStats.byOutcome.draw?.accuracy?.toFixed(0) || 0}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Draws (X)</p>
                        <p className="text-xs text-muted-foreground">
                          {predictionStats.byOutcome.draw?.correct || 0}/{predictionStats.byOutcome.draw?.total || 0}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-away/10 rounded-lg">
                        <p className="text-3xl font-bold text-away">
                          {predictionStats.byOutcome.away?.accuracy?.toFixed(0) || 0}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Away Wins (2)</p>
                        <p className="text-xs text-muted-foreground">
                          {predictionStats.byOutcome.away?.correct || 0}/{predictionStats.byOutcome.away?.total || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accuracy by confidence */}
                {predictionStats.byConfidence && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Accuracy by Confidence Level</h3>
                    <div className="space-y-3">
                      {['high', 'medium', 'low'].map(level => {
                        const data = predictionStats.byConfidence?.[level]
                        if (!data) return null

                        const label = level === 'high' ? 'High (70%+)' :
                                     level === 'medium' ? 'Medium (55-70%)' : 'Low (<55%)'
                        const color = level === 'high' ? 'bg-green-500' :
                                     level === 'medium' ? 'bg-amber-500' : 'bg-red-500'

                        return (
                          <div key={level} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{label}</span>
                              <span className="font-medium">{data.accuracy?.toFixed(0) || 0}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", color)}
                                style={{ width: `${data.accuracy || 0}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {data.correct}/{data.total} predictions
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Model comparison */}
                {predictionStats.byModel && Object.keys(predictionStats.byModel).length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Model Performance Comparison</h3>
                    <div className="space-y-3">
                      {Object.entries(predictionStats.byModel).map(([model, data]: [string, any]) => (
                        <div key={model} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{model}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.total} predictions
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-xl font-bold",
                              data.accuracy >= 60 ? "text-green-500" :
                              data.accuracy >= 40 ? "text-amber-500" : "text-red-500"
                            )}>
                              {data.accuracy?.toFixed(1) || 0}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {data.correct}/{data.total} correct
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!predictionStats && (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No prediction statistics available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
