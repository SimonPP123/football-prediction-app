'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, BarChart3, DollarSign, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostMatchAnalysisSection } from './post-match-analysis-section'

// Factor metadata for display (6-factor system A-F matching NEW_AI_AGENT_PROMPT.txt)
const FACTOR_INFO: Record<string, { name: string; weight: string }> = {
  // Current 6-factor system (totals 100%)
  A_base_strength: { name: 'Base Strength', weight: '24%' },
  B_form: { name: 'Recent Form', weight: '22%' },
  C_key_players: { name: 'Key Players', weight: '11%' },
  D_tactical: { name: 'Tactical Matchup', weight: '20%' },
  E_table_position: { name: 'Table Position', weight: '13%' },
  F_h2h: { name: 'Head-to-Head', weight: '10%' },
  // Legacy factors for backward compatibility
  C_squad: { name: 'Squad', weight: '14%' },
  D_load: { name: 'Load & Calendar', weight: '10%' },
  E_tactical: { name: 'Tactical', weight: '12%' },
  F_motivation: { name: 'Motivation', weight: '10%' },
  G_referee: { name: 'Referee', weight: '5%' },
  H_stadium_weather: { name: 'Stadium/Weather', weight: '8%' },
  I_h2h: { name: 'H2H', weight: '7%' },
}

// Get score color based on value
const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  if (score >= 30) return 'text-orange-500'
  return 'text-red-500'
}

const getScoreBgColor = (score: number) => {
  if (score >= 70) return 'bg-green-500/10 border-green-500/20'
  if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/20'
  if (score >= 30) return 'bg-orange-500/10 border-orange-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

interface RecentResultsTableProps {
  results: any[]
}

export function RecentResultsTable({ results }: RecentResultsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Determine actual result from goals
  const getActualResult = (fixture: any): '1' | 'X' | '2' | null => {
    if (fixture.goals_home === null || fixture.goals_away === null) return null
    if (fixture.goals_home > fixture.goals_away) return '1'
    if (fixture.goals_home < fixture.goals_away) return '2'
    return 'X'
  }

  const getResultBadgeColor = (result: string | null) => {
    switch (result) {
      case '1': return 'bg-home text-white'
      case 'X': return 'bg-draw text-white'
      case '2': return 'bg-away text-white'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Home</th>
              <th className="text-center p-3">Score</th>
              <th className="text-left p-3">Away</th>
              <th className="text-center p-3">Pred</th>
              <th className="text-center p-3">Conf</th>
              <th className="text-center p-3">Pred Score</th>
              <th className="text-center p-3">Result</th>
              <th className="text-center p-3">O/U</th>
              <th className="text-center p-3">BTTS</th>
              <th className="text-center p-3"></th>
            </tr>
          </thead>
          <tbody>
            {results.map((fixture) => {
              // Handle both array and object formats from Supabase
              const prediction = Array.isArray(fixture.prediction)
                ? fixture.prediction[0]
                : fixture.prediction

              const isExpanded = expandedId === fixture.id
              const actualResult = getActualResult(fixture)
              const predictedResult = prediction?.prediction_result
              const wasCorrect = actualResult && predictedResult && actualResult === predictedResult

              // Confidence
              const confidence = prediction?.overall_index || prediction?.confidence_pct || 0

              // Score prediction
              const actualScore = `${fixture.goals_home}-${fixture.goals_away}`
              const predictedScore = prediction?.most_likely_score
              const scoreCorrect = predictedScore === actualScore

              // O/U check
              const totalGoals = (fixture.goals_home || 0) + (fixture.goals_away || 0)
              const actualOverUnder = totalGoals > 2.5 ? 'Over' : 'Under'
              const predictedOverUnder = prediction?.over_under_2_5 || prediction?.factors?.over_under
              const overUnderCorrect = actualOverUnder === predictedOverUnder

              // BTTS check
              const actualBtts = fixture.goals_home > 0 && fixture.goals_away > 0
              const predictedBtts = prediction?.btts === 'Yes' || prediction?.factors?.btts === 'Yes'
              const bttsCorrect = actualBtts === predictedBtts

              return (
                <>
                  <tr
                    key={fixture.id}
                    className={cn(
                      "border-t border-border hover:bg-muted/30 transition-colors",
                      isExpanded && "bg-muted/20"
                    )}
                  >
                    <td className="p-3 text-sm">
                      <div className="font-medium">
                        {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
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
                        <span className={cn(
                          "font-medium text-sm",
                          actualResult === '1' && "text-green-500"
                        )}>
                          {fixture.home_team?.name || 'TBD'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-bold">
                        {fixture.goals_home} - {fixture.goals_away}
                      </span>
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
                        <span className={cn(
                          "font-medium text-sm",
                          actualResult === '2' && "text-green-500"
                        )}>
                          {fixture.away_team?.name || 'TBD'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {prediction ? (
                        <span className={cn(
                          'inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm',
                          getResultBadgeColor(predictedResult)
                        )}>
                          {predictedResult || '?'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-xs text-muted-foreground">
                      {prediction ? `${confidence}%` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {predictedScore ? (
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span className="font-medium">{predictedScore}</span>
                          {scoreCorrect ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {prediction ? (
                        wasCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {predictedOverUnder ? (
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span>{predictedOverUnder}</span>
                          {overUnderCorrect ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {(prediction?.btts || prediction?.factors?.btts) ? (
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span>{prediction.btts || prediction.factors?.btts}</span>
                          {bttsCorrect ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {prediction && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : fixture.id)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {isExpanded && prediction && (
                    <tr key={`${fixture.id}-expanded`}>
                      <td colSpan={11} className="p-4 bg-muted/30 border-t border-border">
                        <div className="space-y-4">
                          {/* Probability Bars */}
                          {prediction.factors && (
                            <div className="space-y-1">
                              <h4 className="text-xs font-medium text-muted-foreground mb-2">Win Probabilities</h4>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-8 font-medium">1</span>
                                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-full bg-home"
                                    style={{ width: `${prediction.factors.home_win_pct || prediction.home_win_pct || 0}%` }}
                                  />
                                </div>
                                <span className="w-12 text-right">{prediction.factors.home_win_pct || prediction.home_win_pct || 0}%</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-8 font-medium">X</span>
                                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-full bg-draw"
                                    style={{ width: `${prediction.factors.draw_pct || prediction.draw_pct || 0}%` }}
                                  />
                                </div>
                                <span className="w-12 text-right">{prediction.factors.draw_pct || prediction.draw_pct || 0}%</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-8 font-medium">2</span>
                                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-full bg-away"
                                    style={{ width: `${prediction.factors.away_win_pct || prediction.away_win_pct || 0}%` }}
                                  />
                                </div>
                                <span className="w-12 text-right">{prediction.factors.away_win_pct || prediction.away_win_pct || 0}%</span>
                              </div>
                            </div>
                          )}

                          {/* Value Bet */}
                          {(prediction.value_bet || prediction.factors?.value_bet) && (
                            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-sm flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-500 shrink-0" />
                              <span className="font-medium text-green-600">Value Bet: </span>
                              <span className="text-foreground">{prediction.value_bet || prediction.factors?.value_bet}</span>
                            </div>
                          )}

                          {/* Key & Risk Factors */}
                          {((prediction.key_factors && prediction.key_factors.length > 0) ||
                            (prediction.risk_factors && prediction.risk_factors.length > 0)) && (
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Key Factors */}
                              {prediction.key_factors && prediction.key_factors.length > 0 && (
                                <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                                  <h4 className="text-xs font-medium flex items-center gap-1 mb-2">
                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                    Key Factors
                                  </h4>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {prediction.key_factors.map((factor: string, i: number) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-green-500 shrink-0">•</span>
                                        <span>{factor}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Risk Factors */}
                              {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                                <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                                  <h4 className="text-xs font-medium flex items-center gap-1 mb-2">
                                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                    Risk Factors
                                  </h4>
                                  <ul className="text-xs text-muted-foreground space-y-1">
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

                          {/* Factor Breakdown */}
                          {prediction.factors && Object.keys(prediction.factors).some(k => k.match(/^[A-I]_/)) && (
                            <div>
                              <h4 className="text-xs font-medium flex items-center gap-1 mb-2">
                                <BarChart3 className="w-3 h-3 text-primary" />
                                Factor Breakdown
                              </h4>
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {Object.entries(prediction.factors)
                                  .filter(([key]) => key.match(/^[A-I]_/))
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([key, value]: [string, any]) => {
                                    const factorInfo = FACTOR_INFO[key]
                                    const score = typeof value === 'object' ? (value.score || value.weighted || 0) : 0
                                    const notes = typeof value === 'object' ? (value.notes || value.reasoning || '') : ''

                                    return (
                                      <div
                                        key={key}
                                        className={cn(
                                          "p-2 rounded-lg border text-xs",
                                          getScoreBgColor(score)
                                        )}
                                        title={notes}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-foreground">
                                            {key.charAt(0)}
                                          </span>
                                          <span className={cn("font-bold", getScoreColor(score))}>
                                            {Math.round(score)}
                                          </span>
                                        </div>
                                        <p className="text-muted-foreground text-[10px] leading-tight truncate">
                                          {factorInfo?.name || key.replace(/_/g, ' ')}
                                        </p>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Analysis Text */}
                          {prediction.analysis_text && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <h4 className="text-xs font-medium mb-2">Analysis</h4>
                              <p className="text-sm text-muted-foreground">{prediction.analysis_text}</p>
                            </div>
                          )}

                          {/* Post-Match Analysis */}
                          <PostMatchAnalysisSection fixtureId={fixture.id} />

                          {/* Model info */}
                          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
                            Model: {prediction.model_used || prediction.model_version || 'AI'}
                          </div>
                        </div>
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
