'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, AlertCircle, RefreshCw, DollarSign, BarChart3, Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OddsMarket, OddsOutcome, Prediction } from '@/types'
import { FactorBreakdown } from './factor-breakdown'

interface PredictionTableProps {
  fixtures: any[]
  onGeneratePrediction?: (fixtureId: string) => Promise<boolean> | void
  generatingIds?: string[]
  errorIds?: Record<string, string>
  onClearError?: (fixtureId: string) => void
}

export function PredictionTable({ fixtures, onGeneratePrediction, generatingIds = [], errorIds = {}, onClearError }: PredictionTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getPredictionBadgeColor = (result: string) => {
    switch (result) {
      case '1': return 'bg-home text-white'
      case 'X': return 'bg-draw text-white'
      case '2': return 'bg-away text-white'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return 'bg-muted text-muted-foreground'
    if (confidence >= 70) return 'bg-green-500/20 text-green-500'
    if (confidence >= 50) return 'bg-yellow-500/20 text-yellow-500'
    return 'bg-red-500/20 text-red-500'
  }

  // Find outcome by type (home team, draw, or away team) - matches by name, not array index
  const findOutcome = (values: OddsOutcome[] | undefined, type: 'home' | 'draw' | 'away', homeTeamName: string, awayTeamName: string): OddsOutcome | undefined => {
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

  // Get best odds for h2h
  const getBestH2HOdds = (odds: OddsMarket[], homeTeamName: string, awayTeamName: string) => {
    const h2hOdds = odds.filter(o => o.bet_type === 'h2h')
    let bestHome = { price: 0, bookmaker: '' }
    let bestDraw = { price: 0, bookmaker: '' }
    let bestAway = { price: 0, bookmaker: '' }

    h2hOdds.forEach(o => {
      const homeVal = findOutcome(o.values, 'home', homeTeamName, awayTeamName)
      const drawVal = findOutcome(o.values, 'draw', homeTeamName, awayTeamName)
      const awayVal = findOutcome(o.values, 'away', homeTeamName, awayTeamName)

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
              <th className="text-center p-3">O/U</th>
              <th className="text-center p-3">BTTS</th>
              <th className="text-center p-3">Value</th>
              <th className="text-center p-3">Odds</th>
              <th className="text-center p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((fixture) => {
              // Handle both array and object formats from Supabase
              // Sort by updated_at DESC to ensure we always show the most recent prediction
              const prediction = Array.isArray(fixture.prediction)
                ? fixture.prediction.slice().sort((a: Prediction, b: Prediction) =>
                    new Date(b.updated_at || b.created_at || 0).getTime() -
                    new Date(a.updated_at || a.created_at || 0).getTime()
                  )[0]
                : fixture.prediction
              const isExpanded = expandedId === fixture.id
              const isGenerating = generatingIds.includes(fixture.id)
              const error = errorIds[fixture.id]

              // Get odds data
              const odds: OddsMarket[] = fixture.odds || []
              const hasOdds = odds.length > 0
              const homeTeamName = fixture.home_team?.name?.toLowerCase() || ''
              const awayTeamName = fixture.away_team?.name?.toLowerCase() || ''
              const { bestHome, bestDraw, bestAway } = hasOdds ? getBestH2HOdds(odds, homeTeamName, awayTeamName) : { bestHome: { price: 0 }, bestDraw: { price: 0 }, bestAway: { price: 0 } }

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
                            alt=""
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
                            alt=""
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
                              All Bookmakers ({odds.filter(o => o.bet_type === 'h2h').length})
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-xs mb-2 text-muted-foreground font-medium">
                              <span>Bookmaker</span>
                              <span className="text-center">1</span>
                              <span className="text-center">X</span>
                              <span className="text-center">2</span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                              {odds.filter(o => o.bet_type === 'h2h').map((o, i) => {
                                const homePrice = findOutcome(o.values, 'home', homeTeamName, awayTeamName)?.price || 0
                                const drawPrice = findOutcome(o.values, 'draw', homeTeamName, awayTeamName)?.price || 0
                                const awayPrice = findOutcome(o.values, 'away', homeTeamName, awayTeamName)?.price || 0
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
                      <td colSpan={11} className="bg-muted/20 p-4">
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
                                compact={true}
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
                              All Bookmakers ({odds.filter(o => o.bet_type === 'h2h').length})
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
                                  {odds.filter(o => o.bet_type === 'h2h').map((o, i) => {
                                    const homePrice = findOutcome(o.values, 'home', homeTeamName, awayTeamName)?.price || 0
                                    const drawPrice = findOutcome(o.values, 'draw', homeTeamName, awayTeamName)?.price || 0
                                    const awayPrice = findOutcome(o.values, 'away', homeTeamName, awayTeamName)?.price || 0
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
                            <div className="md:col-span-2">
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Newspaper className="w-4 h-4 text-blue-500" />
                                Team News
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Home Team News */}
                                <div className="bg-muted/30 rounded-lg p-3">
                                  <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-home"></span>
                                    {fixture.home_team?.name || 'Home'}
                                  </h5>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {prediction.home_team_news || 'No news available'}
                                  </p>
                                </div>
                                {/* Away Team News */}
                                <div className="bg-muted/30 rounded-lg p-3">
                                  <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-away"></span>
                                    {fixture.away_team?.name || 'Away'}
                                  </h5>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {prediction.away_team_news || 'No news available'}
                                  </p>
                                </div>
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
