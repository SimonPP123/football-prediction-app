'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, AlertCircle, RefreshCw, DollarSign, BarChart3, Newspaper, Home, Plane } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import type { OddsMarket, OddsOutcome, Prediction } from '@/types'
import { FactorBreakdown } from './factor-breakdown'

// Helper function for finding outcome - moved outside component for better performance
function findOutcomeHelper(
  values: OddsOutcome[] | undefined,
  type: 'home' | 'draw' | 'away',
  homeTeamName: string,
  awayTeamName: string
): OddsOutcome | undefined {
  if (!values) return undefined
  if (type === 'draw') {
    return values.find(v => v.name?.toLowerCase() === 'draw')
  }
  if (type === 'home') {
    return values.find(v => {
      const name = v.name?.toLowerCase() || ''
      if (name === 'draw') return false
      return name.includes(homeTeamName.split(' ')[0]) || homeTeamName.includes(name.split(' ')[0])
    }) || values.find(v => v.name?.toLowerCase() !== 'draw' && !v.name?.toLowerCase().includes(awayTeamName.split(' ')[0]))
  }
  return values.find(v => {
    const name = v.name?.toLowerCase() || ''
    if (name === 'draw') return false
    return name.includes(awayTeamName.split(' ')[0]) || awayTeamName.includes(name.split(' ')[0])
  }) || values.find(v => v.name?.toLowerCase() !== 'draw' && !v.name?.toLowerCase().includes(homeTeamName.split(' ')[0]))
}

// Helper function for calculating best H2H odds - moved outside component
function calculateBestH2HOdds(odds: OddsMarket[], homeTeamName: string, awayTeamName: string) {
  const h2hOdds = odds.filter(o => o.bet_type === 'h2h')
  let bestHome = { price: 0, bookmaker: '' }
  let bestDraw = { price: 0, bookmaker: '' }
  let bestAway = { price: 0, bookmaker: '' }

  h2hOdds.forEach(o => {
    const homeVal = findOutcomeHelper(o.values, 'home', homeTeamName, awayTeamName)
    const drawVal = findOutcomeHelper(o.values, 'draw', homeTeamName, awayTeamName)
    const awayVal = findOutcomeHelper(o.values, 'away', homeTeamName, awayTeamName)

    if (homeVal && homeVal.price > bestHome.price) {
      bestHome = { price: homeVal.price, bookmaker: o.bookmaker }
    }
    if (drawVal && drawVal.price > bestDraw.price) {
      bestDraw = { price: drawVal.price, bookmaker: o.bookmaker }
    }
    if (awayVal && awayVal.price > bestAway.price) {
      bestAway = { price: awayVal.price, bookmaker: o.bookmaker }
    }
  })

  return { bestHome, bestDraw, bestAway }
}

// Helper function to get sorted prediction
function getSortedPrediction(predictionData: Prediction | Prediction[] | undefined): Prediction | undefined {
  if (!predictionData) return undefined
  if (!Array.isArray(predictionData)) return predictionData
  return predictionData.slice().sort((a: Prediction, b: Prediction) =>
    new Date(b.updated_at || b.created_at || 0).getTime() -
    new Date(a.updated_at || a.created_at || 0).getTime()
  )[0]
}

interface PredictionTableProps {
  fixtures: any[]
  onGeneratePrediction?: (fixtureId: string) => Promise<boolean> | void
  generatingIds?: string[]
  errorIds?: Record<string, string>
  onClearError?: (fixtureId: string) => void
}

function PredictionTableComponent({ fixtures, onGeneratePrediction, generatingIds = [], errorIds = {}, onClearError }: PredictionTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedHomeNews, setExpandedHomeNews] = useState<Record<string, boolean>>({})
  const [expandedAwayNews, setExpandedAwayNews] = useState<Record<string, boolean>>({})

  const toggleHomeNews = useCallback((fixtureId: string) => {
    setExpandedHomeNews(prev => ({ ...prev, [fixtureId]: !prev[fixtureId] }))
  }, [])

  const toggleAwayNews = useCallback((fixtureId: string) => {
    setExpandedAwayNews(prev => ({ ...prev, [fixtureId]: !prev[fixtureId] }))
  }, [])

  const getPredictionBadgeColor = useCallback((result: string) => {
    switch (result) {
      case '1': return 'bg-home text-white'
      case 'X': return 'bg-draw text-white'
      case '2': return 'bg-away text-white'
      default: return 'bg-muted text-muted-foreground'
    }
  }, [])

  const getConfidenceBadge = useCallback((confidence: number | null) => {
    if (!confidence) return 'bg-muted text-muted-foreground'
    if (confidence >= 70) return 'bg-green-500/20 text-green-500'
    if (confidence >= 50) return 'bg-yellow-500/20 text-yellow-500'
    return 'bg-red-500/20 text-red-500'
  }, [])

  // Memoize processed fixtures with predictions and odds
  const processedFixtures = useMemo(() => {
    return fixtures.map(fixture => {
      const prediction = getSortedPrediction(fixture.prediction)
      const odds: OddsMarket[] = fixture.odds || []
      const hasOdds = odds.length > 0
      const homeTeamName = fixture.home_team?.name?.toLowerCase() || ''
      const awayTeamName = fixture.away_team?.name?.toLowerCase() || ''
      const bestOdds = hasOdds
        ? calculateBestH2HOdds(odds, homeTeamName, awayTeamName)
        : { bestHome: { price: 0 }, bestDraw: { price: 0 }, bestAway: { price: 0 } }

      return {
        ...fixture,
        processedPrediction: prediction,
        processedOdds: bestOdds,
        hasOdds
      }
    })
  }, [fixtures])

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Home</th>
              <th className="text-center p-3">Pred</th>
              <th className="text-center p-3">Score</th>
              <th className="text-left p-3">Away</th>
              <th className="text-center p-3">Certainty</th>
              <th className="text-center p-3">Index</th>
              <th className="text-center p-3">O/U</th>
              <th className="text-center p-3">BTTS</th>
              <th className="text-center p-3">Value</th>
              <th className="text-center p-3">Odds</th>
              <th className="text-center p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {processedFixtures.map((fixture) => {
              // Use pre-processed data from memoized fixtures
              const prediction = fixture.processedPrediction
              const { bestHome, bestDraw, bestAway } = fixture.processedOdds
              const hasOdds = fixture.hasOdds
              const isExpanded = expandedId === fixture.id
              const isGenerating = generatingIds.includes(fixture.id)
              const error = errorIds[fixture.id]

              return (
                <>
                  <tr
                    key={fixture.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3 text-sm">
                      <div className="font-medium">
                        {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(fixture.match_date).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {fixture.home_team?.logo && (
                          <img
                            src={fixture.home_team.logo}
                            alt={fixture.home_team.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <span className="font-medium text-sm">
                          {fixture.home_team?.name || 'TBD'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {prediction ? (
                        <span className={cn(
                          'inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm',
                          getPredictionBadgeColor(prediction.prediction_result)
                        )}>
                          {prediction.prediction_result || '?'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-sm font-medium">
                      {prediction?.most_likely_score || '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {fixture.away_team?.logo && (
                          <img
                            src={fixture.away_team.logo}
                            alt={fixture.away_team.name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <span className="font-medium text-sm">
                          {fixture.away_team?.name || 'TBD'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {(prediction?.certainty_score || prediction?.confidence_pct || prediction?.overall_index) ? (
                        <span className={cn(
                          'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium',
                          getConfidenceBadge(prediction.certainty_score || prediction.confidence_pct || prediction.overall_index)
                        )}>
                          {prediction.certainty_score || prediction.confidence_pct || prediction.overall_index}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {prediction?.overall_index != null ? (
                        <span className={cn(
                          'text-sm font-medium',
                          prediction.overall_index >= 60 && 'text-green-600',
                          prediction.overall_index <= 40 && 'text-red-600',
                          prediction.overall_index > 40 && prediction.overall_index < 60 && 'text-muted-foreground'
                        )}>
                          {prediction.overall_index.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-sm">
                      {prediction?.over_under_2_5 || prediction?.factors?.over_under || '-'}
                    </td>
                    <td className="p-3 text-center text-sm">
                      {prediction?.btts || prediction?.factors?.btts || '-'}
                    </td>
                    <td className="p-3 text-center text-sm">
                      {prediction?.value_bet ? (
                        <span className="text-primary font-medium">{prediction.value_bet}</span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {hasOdds ? (
                        <div className="group relative">
                          <div className="flex items-center justify-center gap-1 text-xs cursor-help">
                            <DollarSign className="w-3 h-3 text-green-500" />
                            <span className="font-medium">{bestHome.price.toFixed(2)}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-medium">{bestDraw.price.toFixed(2)}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-medium">{bestAway.price.toFixed(2)}</span>
                          </div>
                          {/* Tooltip with all bookmakers */}
                          <div className="hidden group-hover:block absolute z-50 bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[280px] right-0 top-full mt-1">
                            <div className="text-xs font-medium mb-2 text-foreground">
                              All Bookmakers ({(fixture.odds || []).filter((o: OddsMarket) => o.bet_type === 'h2h').length})
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-xs mb-2 text-muted-foreground font-medium">
                              <span>Bookmaker</span>
                              <span className="text-center">1</span>
                              <span className="text-center">X</span>
                              <span className="text-center">2</span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                              {(fixture.odds || []).filter((o: OddsMarket) => o.bet_type === 'h2h').map((o: OddsMarket, i: number) => {
                                const homeName = fixture.home_team?.name?.toLowerCase() || ''
                                const awayName = fixture.away_team?.name?.toLowerCase() || ''
                                const homePrice = findOutcomeHelper(o.values, 'home', homeName, awayName)?.price || 0
                                const drawPrice = findOutcomeHelper(o.values, 'draw', homeName, awayName)?.price || 0
                                const awayPrice = findOutcomeHelper(o.values, 'away', homeName, awayName)?.price || 0
                                return (
                                  <div key={i} className="grid grid-cols-4 gap-1 text-xs">
                                    <span className="text-muted-foreground truncate">{o.bookmaker}</span>
                                    <span className={cn(
                                      'text-center',
                                      homePrice === bestHome.price && 'text-green-500 font-bold'
                                    )}>{homePrice.toFixed(2)}</span>
                                    <span className={cn(
                                      'text-center',
                                      drawPrice === bestDraw.price && 'text-green-500 font-bold'
                                    )}>{drawPrice.toFixed(2)}</span>
                                    <span className={cn(
                                      'text-center',
                                      awayPrice === bestAway.price && 'text-green-500 font-bold'
                                    )}>{awayPrice.toFixed(2)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {error ? (
                        <button
                          onClick={() => {
                            onClearError?.(fixture.id)
                            onGeneratePrediction?.(fixture.id)
                          }}
                          disabled={isGenerating}
                          className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors disabled:opacity-50"
                          title={error}
                        >
                          {isGenerating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </button>
                      ) : prediction ? (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : fixture.id)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => onGeneratePrediction?.(fixture.id)}
                          disabled={isGenerating}
                          className="p-1 rounded hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <TrendingUp className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {isExpanded && prediction && (
                    <tr key={`${fixture.id}-expanded`}>
                      <td colSpan={12} className="bg-muted/20 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Factor Analysis - New Section */}
                          {prediction.factors && (prediction.factors.A_base_strength || prediction.factors.B_form) && (
                            <div className="md:col-span-2">
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-primary" />
                                Factor Analysis
                              </h4>
                              <FactorBreakdown
                                factors={prediction.factors}
                                overallIndex={prediction.overall_index}
                                alwaysExpanded={true}
                              />
                            </div>
                          )}

                          {/* Probabilities */}
                          {prediction.factors && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Probabilities</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-6">1</span>
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div
                                      className="h-full bg-home rounded-full"
                                      style={{ width: `${prediction.home_win_pct || prediction.factors?.home_win_pct || 0}%` }}
                                    />
                                  </div>
                                  <span className="w-10 text-right">{prediction.home_win_pct || prediction.factors?.home_win_pct || 0}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-6">X</span>
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div
                                      className="h-full bg-draw rounded-full"
                                      style={{ width: `${prediction.draw_pct || prediction.factors?.draw_pct || 0}%` }}
                                    />
                                  </div>
                                  <span className="w-10 text-right">{prediction.draw_pct || prediction.factors?.draw_pct || 0}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-6">2</span>
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div
                                      className="h-full bg-away rounded-full"
                                      style={{ width: `${prediction.away_win_pct || prediction.factors?.away_win_pct || 0}%` }}
                                    />
                                  </div>
                                  <span className="w-10 text-right">{prediction.away_win_pct || prediction.factors?.away_win_pct || 0}%</span>
                                </div>
                              </div>
                              {(prediction.value_bet || prediction.factors?.value_bet) && (
                                <div className="mt-3 p-2 bg-primary/10 rounded text-sm">
                                  <span className="text-primary font-medium">Value: </span>
                                  {prediction.value_bet || prediction.factors?.value_bet}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Betting Odds - All Bookmakers */}
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              All Bookmakers ({(fixture.odds || []).filter((o: OddsMarket) => o.bet_type === 'h2h').length})
                            </h4>
                            {hasOdds ? (
                              <div className="space-y-1">
                                {/* Header row */}
                                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b border-border">
                                  <span>Bookmaker</span>
                                  <span className="text-center">1</span>
                                  <span className="text-center">X</span>
                                  <span className="text-center">2</span>
                                </div>
                                {/* Bookmaker rows */}
                                <div className="max-h-[150px] overflow-y-auto space-y-1">
                                  {(fixture.odds || []).filter((o: OddsMarket) => o.bet_type === 'h2h').map((o: OddsMarket, i: number) => {
                                    const homeName = fixture.home_team?.name?.toLowerCase() || ''
                                    const awayName = fixture.away_team?.name?.toLowerCase() || ''
                                    const homePrice = findOutcomeHelper(o.values, 'home', homeName, awayName)?.price || 0
                                    const drawPrice = findOutcomeHelper(o.values, 'draw', homeName, awayName)?.price || 0
                                    const awayPrice = findOutcomeHelper(o.values, 'away', homeName, awayName)?.price || 0
                                    return (
                                      <div key={i} className="grid grid-cols-4 gap-2 text-sm">
                                        <span className="text-muted-foreground truncate text-xs">{o.bookmaker}</span>
                                        <span className={cn(
                                          'text-center',
                                          homePrice === bestHome.price && 'text-green-500 font-bold'
                                        )}>{homePrice.toFixed(2)}</span>
                                        <span className={cn(
                                          'text-center',
                                          drawPrice === bestDraw.price && 'text-green-500 font-bold'
                                        )}>{drawPrice.toFixed(2)}</span>
                                        <span className={cn(
                                          'text-center',
                                          awayPrice === bestAway.price && 'text-green-500 font-bold'
                                        )}>{awayPrice.toFixed(2)}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No odds available</p>
                            )}
                          </div>

                          {/* Key Factors */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Key Factors</h4>
                            {prediction.key_factors && prediction.key_factors.length > 0 ? (
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {prediction.key_factors.map((factor: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-500">•</span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">No factors available</p>
                            )}
                          </div>

                          {/* Risk Factors */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">Risk Factors</h4>
                            {prediction.risk_factors && prediction.risk_factors.length > 0 ? (
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {prediction.risk_factors.map((factor: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-yellow-500">•</span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground">No risks identified</p>
                            )}
                          </div>

                          {/* Team News */}
                          {(prediction.home_team_news || prediction.away_team_news) && (
                            <div className="md:col-span-2 lg:col-span-4">
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Newspaper className="w-4 h-4 text-blue-500" />
                                Team News
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Home Team News - Collapsible */}
                                {prediction.home_team_news && (
                                  <div>
                                    <button
                                      onClick={() => toggleHomeNews(fixture.id)}
                                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-home/10 hover:bg-home/20 transition-colors text-left"
                                    >
                                      <Home className="w-4 h-4 text-home" />
                                      <span className="text-xs font-medium">{fixture.home_team?.name || 'Home'} News</span>
                                      <ChevronDown className={cn(
                                        "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                                        expandedHomeNews[fixture.id] && "rotate-180"
                                      )} />
                                    </button>
                                    {expandedHomeNews[fixture.id] && (
                                      <div className="mt-1 p-3 bg-muted/30 rounded-lg prose prose-sm dark:prose-invert max-w-none prose-p:text-sm prose-p:text-muted-foreground prose-p:my-1 prose-ul:text-sm prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:my-1 prose-table:text-xs prose-table:w-full prose-th:px-2 prose-th:py-1 prose-th:bg-muted prose-th:text-left prose-th:font-medium prose-td:px-2 prose-td:py-1 prose-td:border-t prose-td:border-border">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{prediction.home_team_news}</ReactMarkdown>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Away Team News - Collapsible */}
                                {prediction.away_team_news && (
                                  <div>
                                    <button
                                      onClick={() => toggleAwayNews(fixture.id)}
                                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-away/10 hover:bg-away/20 transition-colors text-left"
                                    >
                                      <Plane className="w-4 h-4 text-away" />
                                      <span className="text-xs font-medium">{fixture.away_team?.name || 'Away'} News</span>
                                      <ChevronDown className={cn(
                                        "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                                        expandedAwayNews[fixture.id] && "rotate-180"
                                      )} />
                                    </button>
                                    {expandedAwayNews[fixture.id] && (
                                      <div className="mt-1 p-3 bg-muted/30 rounded-lg prose prose-sm dark:prose-invert max-w-none prose-p:text-sm prose-p:text-muted-foreground prose-p:my-1 prose-ul:text-sm prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:my-1 prose-table:text-xs prose-table:w-full prose-th:px-2 prose-th:py-1 prose-th:bg-muted prose-th:text-left prose-th:font-medium prose-td:px-2 prose-td:py-1 prose-td:border-t prose-td:border-border">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{prediction.away_team_news}</ReactMarkdown>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Full Analysis */}
                        {prediction.analysis_text && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-medium mb-2">Full Analysis</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {prediction.analysis_text}
                            </p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Wrap with React.memo to prevent unnecessary re-renders
export const PredictionTable = memo(PredictionTableComponent)
