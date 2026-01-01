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
  TrendingUp,
  Star,
  BookOpen,
  Home,
  Plane,
  ChevronDown,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

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
  const [showScores, setShowScores] = useState(false)
  const [showKeyRiskFactors, setShowKeyRiskFactors] = useState(false)
  const [showHomeNews, setShowHomeNews] = useState(false)
  const [showAwayNews, setShowAwayNews] = useState(false)
  const [showHistoricalAdjustments, setShowHistoricalAdjustments] = useState(false)
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

  // Derive values from fixture (safe for null fixture) - use stable references
  const isCompleted = fixture ? ['FT', 'AET', 'PEN'].includes(fixture.status) : false
  const prediction = fixture ? (Array.isArray(fixture.prediction) ? fixture.prediction[0] : fixture.prediction) : null
  const analysis = fixture ? (Array.isArray(fixture.match_analysis) ? fixture.match_analysis[0] : fixture.match_analysis) : null

  // Memoize derived data to ensure stable references
  const { stats, homeStats, awayStats, events, weather, h2h, odds } = useMemo(() => {
    if (!fixture) {
      return { stats: [], homeStats: {}, awayStats: {}, events: [], weather: null, h2h: null, odds: [] }
    }
    const fixtureStats = fixture.statistics || []
    const homeStatsData = fixtureStats.find((s: any) => s.team_id === fixture.home_team_id)?.statistics || {}
    const awayStatsData = fixtureStats.find((s: any) => s.team_id === fixture.away_team_id)?.statistics || {}
    const fixtureEvents = fixture.events || []
    const fixtureWeather = fixture.weather || null
    const fixtureH2h = fixture.head_to_head || null

    // Transform odds
    const rawOdds = fixture.odds || []
    const transformedOdds = rawOdds.map((o: any) => {
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

    return {
      stats: fixtureStats,
      homeStats: homeStatsData,
      awayStats: awayStatsData,
      events: fixtureEvents,
      weather: fixtureWeather,
      h2h: fixtureH2h,
      odds: transformedOdds,
    }
  }, [fixture])

  const hasInjuries = homeInjuries.length > 0 || awayInjuries.length > 0

  // Derive primitive flags for tab availability (stable values)
  const hasStatistics = isCompleted && Object.keys(homeStats).length > 0
  const hasEvents = events.length > 0
  const hasOdds = odds.length > 0
  const hasWeather = !!weather
  const hasH2h = !!h2h

  // Memoize availability flags using only primitive values - MUST be before early returns
  const tabAvailability = useMemo(() => ({
    prediction: !!prediction,
    injuries: hasInjuries,
    statistics: hasStatistics,
    events: hasEvents,
    odds: hasOdds,
    weather: hasWeather,
    h2h: hasH2h,
    analysis: isCompleted,
  }), [prediction, hasInjuries, hasStatistics, hasEvents, hasOdds, hasWeather, hasH2h, isCompleted])

  // Define available tabs based on data - memoized with stable dependencies
  const tabs: { id: TabType; label: string; icon: typeof Target; available: boolean }[] = useMemo(() => [
    { id: 'prediction', label: 'Prediction', icon: Target, available: tabAvailability.prediction },
    { id: 'injuries', label: 'Injuries', icon: AlertTriangle, available: tabAvailability.injuries },
    { id: 'statistics', label: 'Statistics', icon: BarChart3, available: tabAvailability.statistics },
    { id: 'events', label: 'Events', icon: Calendar, available: tabAvailability.events },
    { id: 'odds', label: 'Odds', icon: DollarSign, available: tabAvailability.odds },
    { id: 'weather', label: 'Weather', icon: CloudRain, available: tabAvailability.weather },
    { id: 'h2h', label: 'H2H', icon: History, available: tabAvailability.h2h },
    { id: 'analysis', label: 'Analysis', icon: Brain, available: tabAvailability.analysis },
  ], [tabAvailability])

  const availableTabs = useMemo(() => tabs.filter(t => t.available), [tabs])

  // Set default tab to first available when tabs change (not when activeTab changes to avoid loop)
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTabs])

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
              {(prediction.factors?.home_win_pct || prediction.home_win_pct || prediction.factors?.draw_pct || prediction.draw_pct || prediction.factors?.away_win_pct || prediction.away_win_pct) && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Outcome Probabilities</h4>
                  <ConfidenceBreakdown
                    homeWin={prediction.factors?.home_win_pct || prediction.home_win_pct || 0}
                    draw={prediction.factors?.draw_pct || prediction.draw_pct || 0}
                    awayWin={prediction.factors?.away_win_pct || prediction.away_win_pct || 0}
                  />
                </div>
              )}

              {/* Additional markets */}
              {(prediction.factors?.over_under || prediction.over_under_2_5 || prediction.factors?.btts || prediction.btts || prediction.factors?.value_bet || prediction.value_bet) && (
                <div className="grid grid-cols-3 gap-4 py-4 border-t border-border">
                  {(prediction.factors?.over_under || prediction.over_under_2_5) && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Over/Under 2.5</p>
                      <p className={cn(
                        "font-bold",
                        (prediction.factors?.over_under || prediction.over_under_2_5) === 'Over' ? 'text-green-500' : 'text-red-500'
                      )}>
                        {prediction.factors?.over_under || prediction.over_under_2_5}
                      </p>
                    </div>
                  )}
                  {(prediction.factors?.btts || prediction.btts) && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Both Teams Score</p>
                      <p className={cn(
                        "font-bold",
                        (prediction.factors?.btts || prediction.btts) === 'Yes' ? 'text-green-500' : 'text-red-500'
                      )}>
                        {prediction.factors?.btts || prediction.btts}
                      </p>
                    </div>
                  )}
                  {(prediction.factors?.value_bet || prediction.value_bet) && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Value Bet</p>
                      <p className="font-bold text-amber-500">
                        {prediction.factors?.value_bet || prediction.value_bet}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Score Predictions */}
              {(prediction.score_predictions?.length > 0 || prediction.most_likely_score) && (
                <div className="border-t border-border pt-4">
                  <button
                    onClick={() => setShowScores(!showScores)}
                    className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
                  >
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Score Predictions</span>
                    {prediction.most_likely_score && (
                      <span className="text-sm bg-primary text-primary-foreground px-2 py-0.5 rounded font-medium">
                        {prediction.most_likely_score}
                      </span>
                    )}
                    <ChevronDown className={cn(
                      "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                      showScores && "rotate-180"
                    )} />
                  </button>
                  {showScores && prediction.score_predictions?.length > 0 && (
                    <div className="mt-2 space-y-1.5 p-3 bg-muted/30 rounded-lg">
                      {prediction.score_predictions
                        .filter((sp: any) => sp.score?.toLowerCase() !== 'other')
                        .sort((a: any, b: any) => (b.probability || 0) - (a.probability || 0))
                        .map((sp: any, idx: number) => (
                          <div key={sp.score} className="flex items-center gap-2 text-sm">
                            <span className="w-12 font-mono font-medium">{sp.score}</span>
                            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  idx === 0 ? "bg-primary" : "bg-primary/50"
                                )}
                                style={{ width: `${Math.min(sp.probability * 3, 100)}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-muted-foreground">{sp.probability}%</span>
                            {idx === 0 && <Star className="w-3 h-3 text-yellow-500" />}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Key & Risk Factors */}
              {((prediction.key_factors?.length > 0) || (prediction.risk_factors?.length > 0)) && (
                <div className="border-t border-border pt-4">
                  <button
                    onClick={() => setShowKeyRiskFactors(!showKeyRiskFactors)}
                    className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
                  >
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Key & Risk Factors</span>
                    <ChevronDown className={cn(
                      "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                      showKeyRiskFactors && "rotate-180"
                    )} />
                  </button>
                  {showKeyRiskFactors && (
                    <div className="mt-2 space-y-4 p-3 bg-muted/30 rounded-lg">
                      {prediction.key_factors?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            Key Factors
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {prediction.key_factors.map((factor: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-green-500 shrink-0">•</span>
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {prediction.risk_factors?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                            <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            Risk Factors
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {prediction.risk_factors.map((factor: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-yellow-500 shrink-0">•</span>
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Historical Adjustments */}
              {prediction.historical_adjustments?.applied && (
                <div className="border-t border-border pt-4">
                  <button
                    onClick={() => setShowHistoricalAdjustments(!showHistoricalAdjustments)}
                    className="w-full flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors text-left"
                  >
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Historical Adjustments Applied</span>
                    {prediction.historical_adjustments.confidence_adjusted_by !== 0 && (
                      <span className="text-xs bg-purple-500/20 text-purple-600 px-2 py-0.5 rounded">
                        {prediction.historical_adjustments.confidence_adjusted_by > 0 ? '+' : ''}
                        {prediction.historical_adjustments.confidence_adjusted_by}%
                      </span>
                    )}
                    <ChevronDown className={cn(
                      "w-4 h-4 ml-auto text-purple-500 transition-transform",
                      showHistoricalAdjustments && "rotate-180"
                    )} />
                  </button>
                  {showHistoricalAdjustments && (
                    <div className="mt-2 p-3 bg-purple-500/10 rounded-lg text-sm">
                      <p className="text-foreground">{prediction.historical_adjustments.reason}</p>
                      {prediction.historical_adjustments.factors_adjusted?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Adjusted factors: {prediction.historical_adjustments.factors_adjusted.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Team News */}
              {(prediction.home_team_news || prediction.away_team_news) && (
                <div className="border-t border-border pt-4 space-y-3">
                  {prediction.home_team_news && (
                    <div>
                      <button
                        onClick={() => setShowHomeNews(!showHomeNews)}
                        className="w-full flex items-center gap-2 p-3 rounded-lg bg-home/10 hover:bg-home/20 transition-colors text-left"
                      >
                        <Home className="w-4 h-4 text-home" />
                        <span className="text-sm font-medium">{fixture.home_team?.name || 'Home'} News</span>
                        <ChevronDown className={cn(
                          "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                          showHomeNews && "rotate-180"
                        )} />
                      </button>
                      {showHomeNews && (
                        <div className="mt-2 p-3 bg-muted/30 rounded-lg prose prose-sm dark:prose-invert max-w-none prose-p:text-sm prose-p:text-muted-foreground prose-p:my-1 prose-ul:text-sm prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:my-1">
                          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{prediction.home_team_news}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                  {prediction.away_team_news && (
                    <div>
                      <button
                        onClick={() => setShowAwayNews(!showAwayNews)}
                        className="w-full flex items-center gap-2 p-3 rounded-lg bg-away/10 hover:bg-away/20 transition-colors text-left"
                      >
                        <Plane className="w-4 h-4 text-away" />
                        <span className="text-sm font-medium">{fixture.away_team?.name || 'Away'} News</span>
                        <ChevronDown className={cn(
                          "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                          showAwayNews && "rotate-180"
                        )} />
                      </button>
                      {showAwayNews && (
                        <div className="mt-2 p-3 bg-muted/30 rounded-lg prose prose-sm dark:prose-invert max-w-none prose-p:text-sm prose-p:text-muted-foreground prose-p:my-1 prose-ul:text-sm prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:my-1">
                          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{prediction.away_team_news}</ReactMarkdown>
                        </div>
                      )}
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
