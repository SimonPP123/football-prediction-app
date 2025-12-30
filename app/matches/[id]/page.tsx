'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { MatchHeader } from '@/components/matches/match-header'
import { StatsComparison } from '@/components/matches/stats-comparison'
import { OddsSection } from '@/components/matches/odds-section'
import { WeatherSection } from '@/components/matches/weather-section'
import { MatchEvents } from '@/components/matches/match-events'
import { PostMatchAnalysis } from '@/components/matches/post-match-analysis'
import { FactorBreakdown } from '@/components/predictions/factor-breakdown'
import { ConfidenceBreakdown } from '@/components/stats/confidence-breakdown'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import { InjuryList } from '@/components/teams/injury-list'
import { useLeague } from '@/contexts/league-context'
import type { Injury } from '@/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  Target,
  BarChart3,
  DollarSign,
  CloudRain,
  History,
  Users,
  Brain,
  Calendar,
  AlertTriangle,
} from 'lucide-react'

type TabType = 'prediction' | 'injuries' | 'statistics' | 'events' | 'odds' | 'weather' | 'h2h' | 'analysis'

export default function MatchDetailPage() {
  const params = useParams()
  const { currentLeague } = useLeague()
  const [fixture, setFixture] = useState<any>(null)
  const [homeInjuries, setHomeInjuries] = useState<Injury[]>([])
  const [awayInjuries, setAwayInjuries] = useState<Injury[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('prediction')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel any pending request when fixture changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    fetchFixture(abortControllerRef.current.signal)

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [params.id, currentLeague?.id])

  const fetchFixture = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/fixtures/${params.id}`, { credentials: 'include', signal })
      if (!res.ok) throw new Error('Failed to fetch fixture')

      if (signal?.aborted) return

      const data = await res.json()

      if (signal?.aborted) return

      setFixture(data)

      // Fetch injuries for both teams if we have team IDs
      if (data.home_team_id && data.away_team_id) {
        const [homeRes, awayRes] = await Promise.all([
          fetch(`/api/injuries?team_id=${data.home_team_id}`, { credentials: 'include', signal }),
          fetch(`/api/injuries?team_id=${data.away_team_id}`, { credentials: 'include', signal })
        ])

        if (signal?.aborted) return

        if (homeRes.ok) {
          const homeData = await homeRes.json()
          if (!signal?.aborted) setHomeInjuries(homeData)
        }
        if (awayRes.ok) {
          const awayData = await awayRes.json()
          if (!signal?.aborted) setAwayInjuries(awayData)
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError('Failed to load match details')
        console.error(err)
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
        <Header title="Match Details" subtitle="Loading..." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error || !fixture) {
    return (
      <div className="min-h-screen">
        <Header title="Match Details" subtitle="Error" />
        <div className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <p className="text-muted-foreground">{error || 'Match not found'}</p>
          <Link href="/matches" className="text-primary hover:underline mt-4 inline-block">
            Back to Matches
          </Link>
        </div>
      </div>
    )
  }

  const isCompleted = ['FT', 'AET', 'PEN'].includes(fixture.status)
  // Handle both array and single object responses
  const prediction = Array.isArray(fixture.prediction) ? fixture.prediction[0] : fixture.prediction
  const analysis = Array.isArray(fixture.match_analysis) ? fixture.match_analysis[0] : fixture.match_analysis

  // Get match statistics
  const stats = fixture.statistics || []
  const homeStats = stats.find((s: any) => s.team_id === fixture.home_team_id)?.statistics || {}
  const awayStats = stats.find((s: any) => s.team_id === fixture.away_team_id)?.statistics || {}

  // Get events
  const events = fixture.events || []

  // Get odds and transform to expected format
  const rawOdds = fixture.odds || []
  const odds = rawOdds.map((o: any) => {
    // Transform values array to flat structure
    const values = o.values || []
    const homeValue = values.find((v: any) =>
      v.name === fixture.home_team?.name || v.name?.toLowerCase().includes('home')
    )
    const awayValue = values.find((v: any) =>
      v.name === fixture.away_team?.name || v.name?.toLowerCase().includes('away')
    )
    const drawValue = values.find((v: any) =>
      v.name?.toLowerCase() === 'draw'
    )

    return {
      bookmaker: o.bookmaker,
      home_win: homeValue?.price,
      draw: drawValue?.price,
      away_win: awayValue?.price,
      updated_at: o.updated_at,
    }
  })

  // Get weather
  const weather = fixture.weather

  // Get H2H
  const h2h = fixture.head_to_head

  // Check if there are any injuries for either team
  const hasInjuries = homeInjuries.length > 0 || awayInjuries.length > 0

  // Define available tabs based on data
  const tabs: { id: TabType; label: string; icon: typeof Target; available: boolean }[] = [
    { id: 'prediction', label: 'Prediction', icon: Target, available: !!prediction },
    { id: 'injuries', label: 'Injuries', icon: AlertTriangle, available: hasInjuries },
    { id: 'statistics', label: 'Statistics', icon: BarChart3, available: isCompleted && Object.keys(homeStats).length > 0 },
    { id: 'events', label: 'Events', icon: Calendar, available: events.length > 0 },
    { id: 'odds', label: 'Odds', icon: DollarSign, available: odds.length > 0 },
    { id: 'weather', label: 'Weather', icon: CloudRain, available: !!weather },
    { id: 'h2h', label: 'H2H', icon: History, available: !!h2h },
    { id: 'analysis', label: 'Analysis', icon: Brain, available: isCompleted },
  ]

  const availableTabs = useMemo(() => tabs.filter(t => t.available), [tabs])

  // Set default tab to first available when tabs change (not when activeTab changes to avoid loop)
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTabs])

  return (
    <div className="min-h-screen">
      <Header
        title={`${fixture.home_team?.name || 'Home'} vs ${fixture.away_team?.name || 'Away'}`}
        subtitle={fixture.round || undefined}
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

        {/* Data freshness indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Data:</span>
          <DataFreshnessBadge category="fixtures" size="sm" showInfo />
          {prediction && <DataFreshnessBadge category="predictions" size="sm" showInfo />}
          {odds.length > 0 && <DataFreshnessBadge category="odds" size="sm" showInfo />}
        </div>

        {/* Match Header */}
        <MatchHeader
          homeTeam={fixture.home_team || { name: 'Home' }}
          awayTeam={fixture.away_team || { name: 'Away' }}
          goalsHome={fixture.goals_home}
          goalsAway={fixture.goals_away}
          status={fixture.status}
          matchDate={fixture.match_date}
          venue={fixture.venue}
          round={fixture.round}
          halfTimeScore={fixture.score_halftime}
        />

        {/* Tabs */}
        {availableTabs.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-2">
            {availableTabs.map(tab => {
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
        )}

        {/* Tab Content */}
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          {/* Prediction Tab */}
          {activeTab === 'prediction' && prediction && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  AI Prediction
                </h3>
                {prediction.model_used && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {prediction.model_used}
                  </span>
                )}
              </div>

              {/* Main prediction */}
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl",
                    prediction.prediction_result === '1' ? 'bg-home text-white' :
                    prediction.prediction_result === 'X' ? 'bg-draw text-white' :
                    'bg-away text-white'
                  )}>
                    {prediction.prediction_result}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {prediction.prediction_result === '1' ? 'Home Win' :
                     prediction.prediction_result === 'X' ? 'Draw' :
                     prediction.prediction_result === '2' ? 'Away Win' :
                     prediction.prediction_result === '1X' ? 'Home or Draw' :
                     prediction.prediction_result === 'X2' ? 'Draw or Away' :
                     'Home or Away'}
                  </p>
                  {/* Certainty score - AI's independent assessment of prediction certainty */}
                  {(prediction.certainty_score || prediction.confidence_pct) && (
                    <p className={cn(
                      "text-sm font-semibold mt-1",
                      (prediction.certainty_score || prediction.confidence_pct) >= 70 ? 'text-green-500' :
                      (prediction.certainty_score || prediction.confidence_pct) >= 50 ? 'text-amber-500' :
                      'text-red-500'
                    )}>
                      {prediction.certainty_score || prediction.confidence_pct}% certain
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">
                    {prediction.overall_index}
                  </p>
                  <p className="text-sm text-muted-foreground">Factor Score</p>
                </div>
              </div>

              {/* Outcome probabilities */}
              {prediction.factors && (prediction.factors.home_win_pct || prediction.factors.draw_pct || prediction.factors.away_win_pct) && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Outcome Probabilities</h4>
                  <ConfidenceBreakdown
                    homeWin={prediction.factors.home_win_pct || 0}
                    draw={prediction.factors.draw_pct || 0}
                    awayWin={prediction.factors.away_win_pct || 0}
                  />
                </div>
              )}

              {/* Additional markets */}
              {prediction.factors && (prediction.factors.over_under || prediction.factors.btts || prediction.factors.value_bet) && (
                <div className="grid grid-cols-3 gap-4 py-4 border-t border-border">
                  {prediction.factors.over_under && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Over/Under 2.5</p>
                      <p className={cn(
                        "font-bold",
                        prediction.factors.over_under === 'Over' ? 'text-green-500' : 'text-red-500'
                      )}>
                        {prediction.factors.over_under}
                      </p>
                    </div>
                  )}
                  {prediction.factors.btts && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Both Teams Score</p>
                      <p className={cn(
                        "font-bold",
                        prediction.factors.btts === 'Yes' ? 'text-green-500' : 'text-red-500'
                      )}>
                        {prediction.factors.btts}
                      </p>
                    </div>
                  )}
                  {prediction.factors.value_bet && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Value Bet</p>
                      <p className="font-bold text-amber-500">
                        {prediction.factors.value_bet}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Factor breakdown - always expanded */}
              {prediction.factors && (
                <FactorBreakdown
                  factors={prediction.factors}
                  overallIndex={prediction.overall_index}
                  alwaysExpanded={true}
                />
              )}

              {/* Analysis text */}
              {prediction.analysis_text && (
                <div className="bg-muted/30 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-sm mb-2">AI Analysis</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {prediction.analysis_text}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Injuries Tab */}
          {activeTab === 'injuries' && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Team Injuries & Unavailable Players
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Home Team Injuries */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                    {fixture.home_team?.logo && (
                      <img
                        src={fixture.home_team.logo}
                        alt={fixture.home_team.name}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <h4 className="font-medium">{fixture.home_team?.name || 'Home'}</h4>
                    {homeInjuries.length > 0 && (
                      <span className="ml-auto text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded">
                        {homeInjuries.length} out
                      </span>
                    )}
                  </div>
                  <InjuryList injuries={homeInjuries} />
                </div>

                {/* Away Team Injuries */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                    {fixture.away_team?.logo && (
                      <img
                        src={fixture.away_team.logo}
                        alt={fixture.away_team.name}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <h4 className="font-medium">{fixture.away_team?.name || 'Away'}</h4>
                    {awayInjuries.length > 0 && (
                      <span className="ml-auto text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded">
                        {awayInjuries.length} out
                      </span>
                    )}
                  </div>
                  <InjuryList injuries={awayInjuries} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center pt-2">
                <DataFreshnessBadge category="injuries" size="sm" showInfo />
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Match Statistics
              </h3>
              <StatsComparison
                homeStats={homeStats}
                awayStats={awayStats}
                homeTeamName={fixture.home_team?.name || 'Home'}
                awayTeamName={fixture.away_team?.name || 'Away'}
              />
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Match Events
              </h3>
              <MatchEvents
                events={events}
                homeTeamId={fixture.home_team_id}
                awayTeamId={fixture.away_team_id}
                homeTeamName={fixture.home_team?.name || 'Home'}
                awayTeamName={fixture.away_team?.name || 'Away'}
              />
            </div>
          )}

          {/* Odds Tab */}
          {activeTab === 'odds' && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Betting Odds
              </h3>
              <OddsSection
                odds={odds}
                homeTeamName={fixture.home_team?.name || 'Home'}
                awayTeamName={fixture.away_team?.name || 'Away'}
              />
            </div>
          )}

          {/* Weather Tab */}
          {activeTab === 'weather' && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-cyan-500" />
                Weather Conditions
              </h3>
              <WeatherSection weather={weather} />
            </div>
          )}

          {/* H2H Tab */}
          {activeTab === 'h2h' && h2h && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-orange-500" />
                Head to Head
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-home/10 rounded-lg p-4">
                  <p className="text-3xl font-bold text-home">{h2h.team1_wins}</p>
                  <p className="text-sm text-muted-foreground">
                    {fixture.home_team?.name} Wins
                  </p>
                </div>
                <div className="bg-draw/10 rounded-lg p-4">
                  <p className="text-3xl font-bold text-draw">{h2h.draws}</p>
                  <p className="text-sm text-muted-foreground">Draws</p>
                </div>
                <div className="bg-away/10 rounded-lg p-4">
                  <p className="text-3xl font-bold text-away">{h2h.team2_wins}</p>
                  <p className="text-sm text-muted-foreground">
                    {fixture.away_team?.name} Wins
                  </p>
                </div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{h2h.matches_played}</strong> matches played
                  {' • '}
                  Goals: <strong>{h2h.team1_goals}</strong> - <strong>{h2h.team2_goals}</strong>
                </p>
              </div>

              {/* Recent meetings */}
              {h2h.fixture_data && h2h.fixture_data.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-medium text-sm">Recent Meetings</h4>
                  {h2h.fixture_data.slice(0, 5).map((match: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-muted/30 rounded p-2 text-sm">
                      <span className="text-muted-foreground">
                        {new Date(match.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="font-medium">
                        {match.homeTeam} {match.homeGoals} - {match.awayGoals} {match.awayTeam}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && isCompleted && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Post-Match Analysis
              </h3>
              {analysis || prediction ? (
                <PostMatchAnalysis
                  analysis={analysis}
                  prediction={prediction}
                  actualResult={{ home: fixture.goals_home || 0, away: fixture.goals_away || 0 }}
                  homeTeamName={fixture.home_team?.name || 'Home'}
                  awayTeamName={fixture.away_team?.name || 'Away'}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No prediction or analysis available for this match</p>
                </div>
              )}
            </div>
          )}

          {/* No tabs available */}
          {availableTabs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No detailed data available for this match yet</p>
              <p className="text-sm mt-2">Check back closer to kick-off for predictions, odds, and more</p>
            </div>
          )}
        </div>

        {/* Quick info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Venue */}
          {fixture.venue && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Venue</p>
              <p className="font-medium text-sm">{fixture.venue.name}</p>
              {fixture.venue.city && (
                <p className="text-xs text-muted-foreground">{fixture.venue.city}</p>
              )}
            </div>
          )}

          {/* Weather compact */}
          {weather && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Weather</p>
              <WeatherSection weather={weather} compact />
            </div>
          )}

          {/* Referee */}
          {fixture.referee && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Referee</p>
              <p className="font-medium text-sm">{fixture.referee}</p>
            </div>
          )}

          {/* Round */}
          {fixture.round && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Round</p>
              <p className="font-medium text-sm">{fixture.round}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
