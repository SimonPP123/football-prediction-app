'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, AlertCircle, RefreshCw, DollarSign, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OddsMarket, OddsOutcome } from '@/types'
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

  // Get best odds for h2h
  const getBestH2HOdds = (odds: OddsMarket[]) => {
    const h2hOdds = odds.filter(o => o.bet_type === 'h2h')
    let bestHome = { price: 0, bookmaker: '' }
    let bestDraw = { price: 0, bookmaker: '' }
    let bestAway = { price: 0, bookmaker: '' }

    h2hOdds.forEach(o => {
      const homeVal = o.values?.[0] as OddsOutcome | undefined
      const drawVal = o.values?.[1] as OddsOutcome | undefined
      const awayVal = o.values?.[2] as OddsOutcome | undefined

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
              <th className="text-left p-3">Away</th>
              <th className="text-center p-3">Conf</th>
              <th className="text-center p-3">O/U</th>
              <th className="text-center p-3">BTTS</th>
              <th className="text-center p-3">Odds</th>
              <th className="text-center p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((fixture) => {
              // Handle both array and object formats from Supabase
              const prediction = Array.isArray(fixture.prediction)
                ? fixture.prediction[0]
                : fixture.prediction
              const isExpanded = expandedId === fixture.id
              const isGenerating = generatingIds.includes(fixture.id)
              const error = errorIds[fixture.id]

              // Get odds data
              const odds: OddsMarket[] = fixture.odds || []
              const hasOdds = odds.length > 0
              const { bestHome, bestDraw, bestAway } = hasOdds ? getBestH2HOdds(odds) : { bestHome: { price: 0 }, bestDraw: { price: 0 }, bestAway: { price: 0 } }

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
                      {prediction?.overall_index ? (
                        <span className={cn(
                          'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium',
                          getConfidenceBadge(prediction.overall_index)
                        )}>
                          {prediction.overall_index}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-sm">
                      {prediction?.factors?.over_under || '-'}
                    </td>
                    <td className="p-3 text-center text-sm">
                      {prediction?.factors?.btts || '-'}
                    </td>
                    <td className="p-3 text-center">
                      {hasOdds ? (
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <DollarSign className="w-3 h-3 text-green-500" />
                          <span className="font-medium">{bestHome.price.toFixed(2)}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="font-medium">{bestDraw.price.toFixed(2)}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="font-medium">{bestAway.price.toFixed(2)}</span>
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
                      <td colSpan={9} className="bg-muted/20 p-4">
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
                                      style={{ width: `${prediction.factors.home_win_pct || 0}%` }}
                                    />
                                  </div>
                                  <span className="w-10 text-right">{prediction.factors.home_win_pct || 0}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-6">X</span>
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div
                                      className="h-full bg-draw rounded-full"
                                      style={{ width: `${prediction.factors.draw_pct || 0}%` }}
                                    />
                                  </div>
                                  <span className="w-10 text-right">{prediction.factors.draw_pct || 0}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-6">2</span>
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div
                                      className="h-full bg-away rounded-full"
                                      style={{ width: `${prediction.factors.away_win_pct || 0}%` }}
                                    />
                                  </div>
                                  <span className="w-10 text-right">{prediction.factors.away_win_pct || 0}%</span>
                                </div>
                              </div>
                              {prediction.factors.value_bet && (
                                <div className="mt-3 p-2 bg-primary/10 rounded text-sm">
                                  <span className="text-primary font-medium">Value: </span>
                                  {prediction.factors.value_bet}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Betting Odds */}
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              Best Odds
                            </h4>
                            {hasOdds ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-6 font-medium">1</span>
                                  <span className="flex-1 text-green-500 font-medium">{bestHome.price.toFixed(2)}</span>
                                  <span className="text-xs text-muted-foreground">{(bestHome as any).bookmaker}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-6 font-medium">X</span>
                                  <span className="flex-1 text-green-500 font-medium">{bestDraw.price.toFixed(2)}</span>
                                  <span className="text-xs text-muted-foreground">{(bestDraw as any).bookmaker}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="w-6 font-medium">2</span>
                                  <span className="flex-1 text-green-500 font-medium">{bestAway.price.toFixed(2)}</span>
                                  <span className="text-xs text-muted-foreground">{(bestAway as any).bookmaker}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  {odds.filter(o => o.bet_type === 'h2h').length} bookmakers
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
                                {prediction.key_factors.slice(0, 4).map((factor: string, i: number) => (
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
                                {prediction.risk_factors.slice(0, 4).map((factor: string, i: number) => (
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
