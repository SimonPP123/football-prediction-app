'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, RefreshCw, History, Target, Star, AlertCircle, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OddsMarket, OddsOutcome } from '@/types'

interface ScorePrediction {
  score: string
  probability: number
}

interface PredictionCardProps {
  fixture: any
  onGeneratePrediction?: (fixtureId: string, regenerate?: boolean) => Promise<boolean> | void
  isGenerating?: boolean
  error?: string
  onClearError?: () => void
}

export function PredictionCard({ fixture, onGeneratePrediction, isGenerating, error, onClearError }: PredictionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showScores, setShowScores] = useState(false) // Collapsed by default
  const [showOdds, setShowOdds] = useState(false) // Collapsed by default
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // Handle both array and object formats from Supabase
  const prediction = Array.isArray(fixture.prediction)
    ? fixture.prediction[0]
    : fixture.prediction
  const hasPrediction = !!prediction

  // Get score predictions from prediction data - sort by probability descending
  const scorePredictons: ScorePrediction[] = (prediction?.score_predictions || [])
    .slice() // Create a copy to avoid mutating original
    .sort((a: ScorePrediction, b: ScorePrediction) => (b.probability || 0) - (a.probability || 0))

  // Most likely score is the one with highest probability (excluding "other")
  const mostLikelyScore = (() => {
    const validScores = scorePredictons.filter(sp =>
      sp.score?.toLowerCase() !== 'other'
    )
    if (validScores.length > 0) return validScores[0].score
    return prediction?.most_likely_score || null
  })()

  // Get odds from fixture
  const odds: OddsMarket[] = fixture.odds || []
  const h2hOdds = odds.filter(o => o.bet_type === 'h2h')
  const totalOdds = odds.filter(o => o.bet_type === 'totals')
  const spreadOdds = odds.filter(o => o.bet_type === 'spreads')
  const hasOdds = odds.length > 0

  // Get team names for odds matching
  const homeTeamName = fixture.home_team?.name?.toLowerCase() || ''
  const awayTeamName = fixture.away_team?.name?.toLowerCase() || ''

  // Find outcome by type (home team, draw, or away team)
  const findOutcome = (values: OddsOutcome[] | undefined, type: 'home' | 'draw' | 'away'): OddsOutcome | undefined => {
    if (!values) return undefined
    if (type === 'draw') {
      return values.find(v => v.name?.toLowerCase() === 'draw')
    }
    if (type === 'home') {
      // Home team outcome - match by name or exclude draw and away
      return values.find(v => {
        const name = v.name?.toLowerCase() || ''
        if (name === 'draw') return false
        // Check if it matches home team name (partial match)
        return name.includes(homeTeamName.split(' ')[0]) || homeTeamName.includes(name.split(' ')[0])
      }) || values.find(v => v.name?.toLowerCase() !== 'draw' && !v.name?.toLowerCase().includes(awayTeamName.split(' ')[0]))
    }
    // Away team
    return values.find(v => {
      const name = v.name?.toLowerCase() || ''
      if (name === 'draw') return false
      return name.includes(awayTeamName.split(' ')[0]) || awayTeamName.includes(name.split(' ')[0])
    }) || values.find(v => v.name?.toLowerCase() !== 'draw' && !v.name?.toLowerCase().includes(homeTeamName.split(' ')[0]))
  }

  // Calculate best odds by outcome type
  const getBestOdds = (oddsArr: OddsMarket[], type: 'home' | 'draw' | 'away') => {
    let best = { price: 0, bookmaker: '' }
    oddsArr.forEach(o => {
      const val = findOutcome(o.values, type)
      if (val && val.price > best.price) {
        best = { price: val.price, bookmaker: o.bookmaker }
      }
    })
    return best
  }

  // Get best h2h odds
  const bestHome = h2hOdds.length > 0 ? getBestOdds(h2hOdds, 'home') : { price: 0, bookmaker: '' }
  const bestDraw = h2hOdds.length > 0 ? getBestOdds(h2hOdds, 'draw') : { price: 0, bookmaker: '' }
  const bestAway = h2hOdds.length > 0 ? getBestOdds(h2hOdds, 'away') : { price: 0, bookmaker: '' }

  // Format relative time for odds update
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  // Fetch prediction history
  const fetchHistory = async () => {
    if (history.length > 0) {
      setShowHistory(!showHistory)
      return
    }
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/predictions/history?fixture_id=${fixture.id}`)
      const data = await res.json()
      if (data.success) {
        setHistory(data.history)
        setShowHistory(true)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const getPredictionBadgeColor = (result: string) => {
    switch (result) {
      case '1': return 'bg-home text-white'
      case 'X': return 'bg-draw text-white'
      case '2': return 'bg-away text-white'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-500'
    if (confidence >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Match Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {fixture.round || 'Premier League'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(fixture.match_date).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex-1 text-center">
            {fixture.home_team?.logo && (
              <img
                src={fixture.home_team.logo}
                alt={fixture.home_team.name}
                className="w-12 h-12 mx-auto mb-2 object-contain"
              />
            )}
            <p className="font-medium text-sm">{fixture.home_team?.name || 'TBD'}</p>
          </div>

          {/* Prediction Badge */}
          <div className="flex flex-col items-center">
            {hasPrediction ? (
              <>
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
                  getPredictionBadgeColor(prediction.prediction_result)
                )}>
                  {prediction.prediction_result || '?'}
                </div>
                <span className={cn('text-xs mt-1', getConfidenceColor(prediction.overall_index || 0))}>
                  {prediction.overall_index}%
                </span>
              </>
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold">
                vs
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            {fixture.away_team?.logo && (
              <img
                src={fixture.away_team.logo}
                alt={fixture.away_team.name}
                className="w-12 h-12 mx-auto mb-2 object-contain"
              />
            )}
            <p className="font-medium text-sm">{fixture.away_team?.name || 'TBD'}</p>
          </div>
        </div>

        {/* Quick Stats */}
        {hasPrediction && prediction.factors && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">O/U 2.5</p>
              <p className="font-medium">{prediction.factors.over_under || 'N/A'}</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">BTTS</p>
              <p className="font-medium">{prediction.factors.btts || 'N/A'}</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">Value</p>
              <p className="font-medium truncate">{prediction.factors.value_bet || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Probability Bars */}
        {hasPrediction && prediction.factors && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-8">1</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-home"
                  style={{ width: `${prediction.factors.home_win_pct || prediction.home_win_pct || 0}%` }}
                />
              </div>
              <span className="w-8 text-right">{prediction.factors.home_win_pct || prediction.home_win_pct || 0}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-8">X</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-draw"
                  style={{ width: `${prediction.factors.draw_pct || prediction.draw_pct || 0}%` }}
                />
              </div>
              <span className="w-8 text-right">{prediction.factors.draw_pct || prediction.draw_pct || 0}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-8">2</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-away"
                  style={{ width: `${prediction.factors.away_win_pct || prediction.away_win_pct || 0}%` }}
                />
              </div>
              <span className="w-8 text-right">{prediction.factors.away_win_pct || prediction.away_win_pct || 0}%</span>
            </div>
          </div>
        )}

        {/* Score Predictions - Collapsible */}
        {hasPrediction && (scorePredictons.length > 0 || mostLikelyScore) && (
          <div className="mt-4">
            {/* Collapsed state - just show most likely score badge */}
            <button
              onClick={() => setShowScores(!showScores)}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
            >
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Most Likely:</span>
              {mostLikelyScore && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded font-medium">
                  {mostLikelyScore}
                </span>
              )}
              {scorePredictons.length > 0 && scorePredictons[0] && (
                <span className="text-xs text-muted-foreground">
                  ({scorePredictons[0].probability}%)
                </span>
              )}
              <ChevronDown className={cn(
                "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                showScores && "rotate-180"
              )} />
            </button>

            {/* Expanded state - show all scores with probability bars */}
            {showScores && scorePredictons.length > 0 && (
              <div className="mt-2 space-y-1.5 p-2 bg-muted/30 rounded-lg">
                {scorePredictons.map((sp, idx) => (
                  <div key={sp.score} className="flex items-center gap-2 text-xs">
                    <span className="w-10 font-mono font-medium">{sp.score}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          idx === 0 ? "bg-primary" : "bg-primary/50"
                        )}
                        style={{ width: `${Math.min(sp.probability * 3, 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-muted-foreground">{sp.probability}%</span>
                    {idx === 0 && <Star className="w-3 h-3 text-yellow-500 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Betting Odds - Collapsible */}
        {hasOdds && (
          <div className="mt-4">
            {/* Quick view - best odds */}
            <button
              onClick={() => setShowOdds(!showOdds)}
              className="w-full flex items-center gap-2 p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors text-left"
            >
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium">Best Odds:</span>
              <div className="flex gap-3 text-xs">
                {bestHome.price > 0 && (
                  <span>1: <strong className="text-foreground">{bestHome.price.toFixed(2)}</strong></span>
                )}
                {bestDraw.price > 0 && (
                  <span>X: <strong className="text-foreground">{bestDraw.price.toFixed(2)}</strong></span>
                )}
                {bestAway.price > 0 && (
                  <span>2: <strong className="text-foreground">{bestAway.price.toFixed(2)}</strong></span>
                )}
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                showOdds && "rotate-180"
              )} />
            </button>

            {/* Expanded odds view - all bookmakers */}
            {showOdds && (
              <div className="mt-2 space-y-3 p-3 bg-muted/30 rounded-lg max-h-72 overflow-y-auto">
                {/* H2H Market */}
                {h2hOdds.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-2 text-muted-foreground">Match Result (1X2)</h5>
                    <div className="grid grid-cols-4 gap-1 text-xs mb-1 px-1">
                      <span className="text-muted-foreground">Bookmaker</span>
                      <span className="text-center text-muted-foreground">1</span>
                      <span className="text-center text-muted-foreground">X</span>
                      <span className="text-center text-muted-foreground">2</span>
                    </div>
                    <div className="space-y-1">
                      {h2hOdds.map(o => {
                        const homeOdds = findOutcome(o.values, 'home')
                        const drawOdds = findOutcome(o.values, 'draw')
                        const awayOdds = findOutcome(o.values, 'away')
                        return (
                          <div key={o.id} className="grid grid-cols-4 gap-1 text-xs bg-card rounded p-1">
                            <span className="text-muted-foreground truncate">{o.bookmaker}</span>
                            <span className={cn(
                              "text-center font-medium",
                              homeOdds?.price === bestHome.price && bestHome.price > 0 && "text-green-500"
                            )}>
                              {homeOdds?.price?.toFixed(2) || '-'}
                            </span>
                            <span className={cn(
                              "text-center font-medium",
                              drawOdds?.price === bestDraw.price && bestDraw.price > 0 && "text-green-500"
                            )}>
                              {drawOdds?.price?.toFixed(2) || '-'}
                            </span>
                            <span className={cn(
                              "text-center font-medium",
                              awayOdds?.price === bestAway.price && bestAway.price > 0 && "text-green-500"
                            )}>
                              {awayOdds?.price?.toFixed(2) || '-'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Totals Market */}
                {totalOdds.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-2 text-muted-foreground">Over/Under Goals</h5>
                    <div className="space-y-1">
                      {totalOdds.map(o => {
                        const overOutcome = o.values?.find((v: OddsOutcome) => v.name?.toLowerCase().includes('over'))
                        const underOutcome = o.values?.find((v: OddsOutcome) => v.name?.toLowerCase().includes('under'))
                        return (
                          <div key={o.id} className="flex items-center gap-2 text-xs bg-card rounded p-1">
                            <span className="w-20 text-muted-foreground truncate">{o.bookmaker}</span>
                            <span className="flex-1 text-center">
                              O{(overOutcome as OddsOutcome)?.point || '2.5'}: <strong>{(overOutcome as OddsOutcome)?.price?.toFixed(2) || '-'}</strong>
                            </span>
                            <span className="flex-1 text-center">
                              U{(underOutcome as OddsOutcome)?.point || '2.5'}: <strong>{(underOutcome as OddsOutcome)?.price?.toFixed(2) || '-'}</strong>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Spreads Market */}
                {spreadOdds.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-2 text-muted-foreground">Asian Handicap</h5>
                    <div className="space-y-1">
                      {spreadOdds.map(o => (
                        <div key={o.id} className="flex items-center gap-2 text-xs bg-card rounded p-1">
                          <span className="w-20 text-muted-foreground truncate">{o.bookmaker}</span>
                          {o.values?.slice(0, 2).map((v: OddsOutcome, idx: number) => (
                            <span key={idx} className="flex-1 text-center">
                              {v.name?.split(' ').pop() || 'Home'} ({v.point?.toFixed(1)}): <strong>{v.price?.toFixed(2)}</strong>
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last updated */}
                <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 flex items-center gap-1">
                  <span>Updated: {formatRelativeTime(odds[0]?.updated_at || new Date().toISOString())}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{h2hOdds.length} bookmaker{h2hOdds.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No odds available message */}
        {!hasOdds && hasPrediction && (
          <div className="mt-4 p-2 bg-muted/30 rounded-lg text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
            <DollarSign className="w-4 h-4 opacity-50" />
            No betting odds available yet
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="border-t border-border bg-red-500/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-500 font-medium">Generation Failed</p>
              <p className="text-xs text-red-400 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => {
                onClearError?.()
                onGeneratePrediction?.(fixture.id)
              }}
              disabled={isGenerating}
              className="shrink-0 px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Generate / Expand Button */}
      <div className={cn("border-t border-border", error && "border-t-0")}>
        {hasPrediction ? (
          <div className="flex divide-x divide-border">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-1 p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Analysis
                </>
              )}
            </button>
            <button
              onClick={() => onGeneratePrediction?.(fixture.id, true)}
              disabled={isGenerating}
              className="flex-1 p-3 flex items-center justify-center gap-2 text-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              title="Regenerate prediction with current model"
            >
              <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </button>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="flex-1 p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              title="View prediction history"
            >
              <History className={cn("w-4 h-4", loadingHistory && "animate-spin")} />
              History
            </button>
          </div>
        ) : !error && (
          <button
            onClick={() => onGeneratePrediction?.(fixture.id)}
            disabled={isGenerating}
            className="w-full p-3 flex items-center justify-center gap-2 text-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <TrendingUp className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate Prediction'}
          </button>
        )}
      </div>

      {/* Expanded Analysis */}
      {expanded && hasPrediction && (
        <div className="border-t border-border p-4 bg-muted/20 space-y-4">
          {/* Key Factors */}
          {prediction.key_factors && prediction.key_factors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Key Factors
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {prediction.key_factors.map((factor: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Factors */}
          {prediction.risk_factors && prediction.risk_factors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Risk Factors
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {prediction.risk_factors.map((factor: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Analysis */}
          {prediction.analysis_text && (
            <div>
              <h4 className="text-sm font-medium mb-2">Analysis</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {prediction.analysis_text}
              </p>
            </div>
          )}

          {/* Model Info */}
          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Generated by {prediction.model_used || prediction.model_version || 'AI'} •
            {prediction.updated_at && ` Updated ${new Date(prediction.updated_at).toLocaleDateString()}`}
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="border-t border-border p-4 bg-muted/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <History className="w-4 h-4" />
              Prediction History ({history.length})
            </h4>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((h, idx) => {
              const isHistoryExpanded = expandedHistoryId === h.id

              return (
                <div key={h.id || idx} className="bg-card border rounded-lg overflow-hidden">
                  {/* Header - Always Visible */}
                  <button
                    onClick={() => setExpandedHistoryId(isHistoryExpanded ? null : h.id)}
                    className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    {/* Row 1: Prediction + Confidence + Date */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                          h.prediction_result === '1' && 'bg-home text-white',
                          h.prediction_result === 'X' && 'bg-draw text-white',
                          h.prediction_result === '2' && 'bg-away text-white'
                        )}>
                          {h.prediction_result || '?'}
                        </span>
                        <span className="font-medium text-sm">
                          {h.confidence_pct || h.overall_index}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isHistoryExpanded && "rotate-180")} />
                    </div>

                    {/* Row 2: Quick Stats */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="bg-muted px-2 py-0.5 rounded">{h.model_used || 'AI'}</span>
                      {(() => {
                        // Sort history score predictions by probability to get true most likely (excluding "other")
                        const sortedScores = (h.score_predictions || [])
                          .slice()
                          .filter((sp: any) => sp.score?.toLowerCase() !== 'other')
                          .sort((a: any, b: any) => (b.probability || 0) - (a.probability || 0))
                        const historyMostLikely = sortedScores.length > 0
                          ? sortedScores[0].score
                          : h.most_likely_score
                        return historyMostLikely ? (
                          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">
                            {historyMostLikely}
                          </span>
                        ) : null
                      })()}
                      {(h.over_under_2_5 || h.factors?.over_under) && (
                        <span className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">
                          {h.over_under_2_5 || h.factors?.over_under}
                        </span>
                      )}
                      {(h.btts || h.factors?.btts) && (
                        <span className="bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded">
                          BTTS: {h.btts || h.factors?.btts}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Probability Bar */}
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <span className="w-6">1</span>
                      <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-muted">
                        <div className="bg-home" style={{ width: `${h.home_win_pct || h.factors?.home_win_pct || 0}%` }} />
                        <div className="bg-draw" style={{ width: `${h.draw_pct || h.factors?.draw_pct || 0}%` }} />
                        <div className="bg-away" style={{ width: `${h.away_win_pct || h.factors?.away_win_pct || 0}%` }} />
                      </div>
                      <span className="w-6 text-right">2</span>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isHistoryExpanded && (
                    <div className="border-t border-border p-3 space-y-3 bg-muted/10 text-sm">
                      {/* Probability Breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-home/10 rounded p-2">
                          <div className="text-xs text-muted-foreground">Home</div>
                          <div className="font-bold text-home">
                            {h.home_win_pct || h.factors?.home_win_pct || 0}%
                          </div>
                        </div>
                        <div className="bg-draw/10 rounded p-2">
                          <div className="text-xs text-muted-foreground">Draw</div>
                          <div className="font-bold text-draw">
                            {h.draw_pct || h.factors?.draw_pct || 0}%
                          </div>
                        </div>
                        <div className="bg-away/10 rounded p-2">
                          <div className="text-xs text-muted-foreground">Away</div>
                          <div className="font-bold text-away">
                            {h.away_win_pct || h.factors?.away_win_pct || 0}%
                          </div>
                        </div>
                      </div>

                      {/* Score Predictions */}
                      {h.score_predictions && h.score_predictions.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium mb-1 text-muted-foreground">Score Predictions</h5>
                          <div className="flex flex-wrap gap-1">
                            {h.score_predictions
                              .slice()
                              .sort((a: any, b: any) => (b.probability || 0) - (a.probability || 0))
                              .slice(0, 5)
                              .map((sp: any, i: number) => (
                              <span key={i} className={cn(
                                "text-xs px-2 py-0.5 rounded",
                                i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                              )}>
                                {sp.score} ({sp.probability}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Factors */}
                      {h.key_factors && h.key_factors.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            Key Factors
                          </h5>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {h.key_factors.slice(0, 3).map((f: string, i: number) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-green-500 shrink-0">•</span>
                                <span className="line-clamp-2">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Risk Factors */}
                      {h.risk_factors && h.risk_factors.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            Risk Factors
                          </h5>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {h.risk_factors.slice(0, 3).map((f: string, i: number) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-yellow-500 shrink-0">•</span>
                                <span className="line-clamp-2">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Analysis */}
                      {h.analysis_text && (
                        <div>
                          <h5 className="text-xs font-medium mb-1">Analysis</h5>
                          <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                            {h.analysis_text}
                          </p>
                        </div>
                      )}

                      {/* Value Bet */}
                      {(h.value_bet || h.factors?.value_bet) && (
                        <div className="p-2 bg-primary/10 rounded text-xs">
                          <span className="font-medium text-primary">Value Bet: </span>
                          {h.value_bet || h.factors?.value_bet}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showHistory && history.length === 0 && (
        <div className="border-t border-border p-4 bg-muted/10 text-center text-sm text-muted-foreground">
          No prediction history available
        </div>
      )}
    </div>
  )
}
