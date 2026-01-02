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
  ChevronDown,
  ChevronUp,
  Calendar,
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
  const [showMatches, setShowMatches] = useState(false)

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
            {predictionStats && predictionStats.total > 0 ? (
              <>
                {/* Hero: Overall Record */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Main Accuracy Display */}
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-sm text-muted-foreground mb-1">Overall Prediction Accuracy</p>
                      <div className="flex items-baseline gap-2 justify-center md:justify-start">
                        <span className={cn(
                          "text-5xl font-bold",
                          predictionStats.accuracy >= 55 ? "text-green-500" :
                          predictionStats.accuracy >= 45 ? "text-amber-500" : "text-red-500"
                        )}>
                          {predictionStats.accuracy?.toFixed(0)}%
                        </span>
                        <span className="text-muted-foreground">
                          ({predictionStats.correct} of {predictionStats.total} correct)
                        </span>
                      </div>
                    </div>
                    {/* Visual Progress */}
                    <div className="w-full md:w-64">
                      <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${(predictionStats.correct / predictionStats.total) * 100}%` }}
                        />
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${(predictionStats.incorrect / predictionStats.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-green-500">{predictionStats.correct} correct</span>
                        <span className="text-red-500">{predictionStats.incorrect} wrong</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Match Result Predictions (1X2) - The Core */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Match Result Predictions (1X2)</h3>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* Home Win */}
                    <div className="relative overflow-hidden rounded-lg border-2 border-home/30 bg-home/5 p-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">1</div>
                        <div className="text-sm text-muted-foreground mb-2">Home Win</div>
                        <div className={cn(
                          "text-2xl font-bold",
                          (predictionStats.byOutcome?.home?.accuracy || 0) >= 50 ? "text-green-500" : "text-red-500"
                        )}>
                          {predictionStats.byOutcome?.home?.accuracy?.toFixed(0) || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {predictionStats.byOutcome?.home?.correct || 0}/{predictionStats.byOutcome?.home?.total || 0} correct
                        </div>
                      </div>
                      {/* Background indicator */}
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-home/20 transition-all"
                        style={{ height: `${predictionStats.byOutcome?.home?.accuracy || 0}%` }}
                      />
                    </div>

                    {/* Draw */}
                    <div className="relative overflow-hidden rounded-lg border-2 border-draw/30 bg-draw/5 p-4">
                      <div className="text-center relative z-10">
                        <div className="text-3xl font-bold mb-1">X</div>
                        <div className="text-sm text-muted-foreground mb-2">Draw</div>
                        <div className={cn(
                          "text-2xl font-bold",
                          (predictionStats.byOutcome?.draw?.accuracy || 0) >= 50 ? "text-green-500" : "text-red-500"
                        )}>
                          {predictionStats.byOutcome?.draw?.accuracy?.toFixed(0) || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {predictionStats.byOutcome?.draw?.correct || 0}/{predictionStats.byOutcome?.draw?.total || 0} correct
                        </div>
                      </div>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-draw/20 transition-all"
                        style={{ height: `${predictionStats.byOutcome?.draw?.accuracy || 0}%` }}
                      />
                    </div>

                    {/* Away Win */}
                    <div className="relative overflow-hidden rounded-lg border-2 border-away/30 bg-away/5 p-4">
                      <div className="text-center relative z-10">
                        <div className="text-3xl font-bold mb-1">2</div>
                        <div className="text-sm text-muted-foreground mb-2">Away Win</div>
                        <div className={cn(
                          "text-2xl font-bold",
                          (predictionStats.byOutcome?.away?.accuracy || 0) >= 50 ? "text-green-500" : "text-red-500"
                        )}>
                          {predictionStats.byOutcome?.away?.accuracy?.toFixed(0) || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {predictionStats.byOutcome?.away?.correct || 0}/{predictionStats.byOutcome?.away?.total || 0} correct
                        </div>
                      </div>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-away/20 transition-all"
                        style={{ height: `${predictionStats.byOutcome?.away?.accuracy || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary line */}
                  <div className="text-center text-sm text-muted-foreground border-t pt-3">
                    Overall 1X2 accuracy: <span className="font-medium text-foreground">{Math.round(predictionStats.result_accuracy)}%</span>
                    {' '}({predictionStats.byOutcome ?
                      (predictionStats.byOutcome.home?.correct || 0) +
                      (predictionStats.byOutcome.draw?.correct || 0) +
                      (predictionStats.byOutcome.away?.correct || 0) : 0} of {predictionStats.byOutcome ?
                      (predictionStats.byOutcome.home?.total || 0) +
                      (predictionStats.byOutcome.draw?.total || 0) +
                      (predictionStats.byOutcome.away?.total || 0) : 0} matches)
                  </div>
                </div>

                {/* Other Betting Markets */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Other Betting Markets</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Over/Under 2.5 */}
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1">Over/Under 2.5 Goals</div>
                      <div className={cn(
                        "text-3xl font-bold",
                        predictionStats.over_under_accuracy >= 55 ? "text-green-500" :
                        predictionStats.over_under_accuracy >= 45 ? "text-amber-500" : "text-red-500"
                      )}>
                        {Math.round(predictionStats.over_under_accuracy)}%
                      </div>
                    </div>

                    {/* BTTS */}
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1">Both Teams to Score</div>
                      <div className={cn(
                        "text-3xl font-bold",
                        predictionStats.btts_accuracy >= 55 ? "text-green-500" :
                        predictionStats.btts_accuracy >= 45 ? "text-amber-500" : "text-red-500"
                      )}>
                        {Math.round(predictionStats.btts_accuracy)}%
                      </div>
                    </div>

                    {/* Exact Score */}
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1">Exact Score</div>
                      <div className="text-3xl font-bold text-primary">
                        {predictionStats.scorePrediction?.accuracy || Math.round(predictionStats.score_accuracy)}%
                      </div>
                      {predictionStats.scorePrediction && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {predictionStats.scorePrediction.closeAccuracy}% within 1 goal
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* When to Trust Predictions */}
                {(predictionStats.byConfidence || predictionStats.scoreIndex?.byRange) && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">When to Trust Predictions</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Accuracy based on the AI's certainty % in its prediction
                    </p>

                    {/* Certainty Level Breakdown */}
                    {predictionStats.byConfidence && (
                      <div className="space-y-3">
                        {[
                          { key: 'high', label: 'High Certainty', sublabel: 'AI very sure (70%+)', icon: '🎯' },
                          { key: 'medium', label: 'Medium Certainty', sublabel: 'AI moderately sure (55-70%)', icon: '📊' },
                          { key: 'low', label: 'Low Certainty', sublabel: 'AI uncertain (<55%)', icon: '❓' },
                        ].map(({ key, label, sublabel, icon }) => {
                          const data = predictionStats.byConfidence[key]
                          if (!data || data.total === 0) return null
                          const accuracy = data.accuracy || 0
                          return (
                            <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                              <span className="text-2xl">{icon}</span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">{label}</span>
                                  <span className={cn(
                                    "font-bold",
                                    accuracy >= 55 ? "text-green-500" :
                                    accuracy >= 45 ? "text-amber-500" : "text-red-500"
                                  )}>
                                    {accuracy.toFixed(0)}% accurate
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        accuracy >= 55 ? "bg-green-500" :
                                        accuracy >= 45 ? "bg-amber-500" : "bg-red-500"
                                      )}
                                      style={{ width: `${accuracy}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-16 text-right">
                                    {data.correct}/{data.total}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Calibration Alert */}
                    {predictionStats.confidenceStats && (
                      <div className={cn(
                        "mt-4 p-3 rounded-lg flex items-start gap-2",
                        predictionStats.confidenceStats.incorrectAvg > predictionStats.confidenceStats.correctAvg
                          ? "bg-orange-500/10 border border-orange-500/20"
                          : "bg-green-500/10 border border-green-500/20"
                      )}>
                        {predictionStats.confidenceStats.incorrectAvg > predictionStats.confidenceStats.correctAvg ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <span className="font-medium text-orange-600">Caution: </span>
                              <span className="text-muted-foreground">
                                AI certainty doesn't correlate well with accuracy yet.
                                Use predictions as one input among many.
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <span className="font-medium text-green-600">Good sign: </span>
                              <span className="text-muted-foreground">
                                Higher certainty predictions tend to be more accurate.
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Models Comparison */}
                {predictionStats.byModel && Object.keys(predictionStats.byModel).length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">AI Model Performance</h3>
                    <div className="space-y-2">
                      {Object.entries(predictionStats.byModel)
                        .sort(([, a]: [string, any], [, b]: [string, any]) => b.accuracy - a.accuracy)
                        .map(([model, data]: [string, any], index) => {
                          // Extract just the model name (remove provider prefix)
                          const modelName = model.includes('/') ? model.split('/').pop() : model
                          return (
                            <div key={model} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                              <span className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                index === 0 ? "bg-yellow-500/20 text-yellow-600" : "bg-muted text-muted-foreground"
                              )}>
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{modelName}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {data.correct}/{data.total}
                                </span>
                                <span className={cn(
                                  "font-bold text-lg w-14 text-right",
                                  data.accuracy >= 55 ? "text-green-500" :
                                  data.accuracy >= 45 ? "text-amber-500" : "text-red-500"
                                )}>
                                  {data.accuracy?.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Analyzed Matches - Collapsible */}
                {predictionStats.matches && predictionStats.matches.length > 0 && (
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowMatches(!showMatches)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">Analyzed Matches</h3>
                        <span className="text-sm text-muted-foreground">
                          ({predictionStats.matches.length} matches)
                        </span>
                      </div>
                      {showMatches ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>

                    {showMatches && (
                      <div className="border-t border-border divide-y divide-border max-h-[500px] overflow-y-auto">
                        {predictionStats.matches.map((match: any) => {
                          const formatDate = (dateStr: string) => {
                            const date = new Date(dateStr)
                            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          }

                          // Parse actual score
                          const [homeGoals, awayGoals] = (match.actualScore || '0-0').split('-').map(Number)

                          // Determine actual result
                          const actualResult = homeGoals > awayGoals ? '1' : homeGoals < awayGoals ? '2' : 'X'

                          // Normalize predicted result for display
                          const predDisplay = match.predictedResult?.toString().toUpperCase()
                            .replace('HOME', '1').replace('AWAY', '2').replace('DRAW', 'X') || '?'

                          return (
                            <div key={match.id} className="p-3 hover:bg-muted/20">
                              <div className="flex items-center gap-3">
                                {/* Date */}
                                <div className="text-xs text-muted-foreground w-12 shrink-0">
                                  {match.kickoff ? formatDate(match.kickoff) : '—'}
                                </div>

                                {/* Teams & Score */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {/* Home Team */}
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                                      <span className="text-sm font-medium truncate">
                                        {match.homeTeam?.short_name || match.homeTeam?.name || 'Home'}
                                      </span>
                                      {match.homeTeam?.logo && (
                                        <img src={match.homeTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                                      )}
                                    </div>

                                    {/* Score */}
                                    <div className="px-2 py-1 bg-muted rounded text-sm font-bold min-w-[50px] text-center">
                                      {match.actualScore || '?-?'}
                                    </div>

                                    {/* Away Team */}
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                      {match.awayTeam?.logo && (
                                        <img src={match.awayTeam.logo} alt="" className="w-5 h-5 object-contain shrink-0" />
                                      )}
                                      <span className="text-sm font-medium truncate">
                                        {match.awayTeam?.short_name || match.awayTeam?.name || 'Away'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Prediction & Result */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Predicted */}
                                  <div className="text-center">
                                    <div className="text-[10px] text-muted-foreground">Pred</div>
                                    <div className={cn(
                                      "text-sm font-bold px-2 py-0.5 rounded",
                                      predDisplay === '1' ? "bg-home/20 text-home" :
                                      predDisplay === '2' ? "bg-away/20 text-away" :
                                      predDisplay === 'X' ? "bg-draw/20 text-draw" : "bg-muted"
                                    )}>
                                      {predDisplay}
                                    </div>
                                  </div>

                                  {/* Actual */}
                                  <div className="text-center">
                                    <div className="text-[10px] text-muted-foreground">Actual</div>
                                    <div className={cn(
                                      "text-sm font-bold px-2 py-0.5 rounded",
                                      actualResult === '1' ? "bg-home/20 text-home" :
                                      actualResult === '2' ? "bg-away/20 text-away" :
                                      "bg-draw/20 text-draw"
                                    )}>
                                      {actualResult}
                                    </div>
                                  </div>

                                  {/* Result indicator */}
                                  <div className="w-6 h-6 flex items-center justify-center">
                                    {match.resultCorrect ? (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-red-500" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Additional info row */}
                              {(match.predictedScore || match.certainty) && (
                                <div className="flex items-center gap-4 mt-1.5 ml-12 text-xs text-muted-foreground">
                                  {match.predictedScore && (
                                    <span>
                                      Predicted: {match.predictedScore}
                                      {match.scoreCorrect && (
                                        <span className="text-green-500 ml-1">exact!</span>
                                      )}
                                    </span>
                                  )}
                                  {match.certainty && (
                                    <span>Certainty: {Math.round(match.certainty)}%</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No prediction data yet</p>
                <p className="text-sm mt-1">Generate predictions and wait for matches to complete to see statistics</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
