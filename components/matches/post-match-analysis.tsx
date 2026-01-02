'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Target, BarChart3, TrendingUp, Brain, Lightbulb, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MatchAnalysis {
  id: string
  accuracy_score?: number
  actual_outcome?: string
  actual_result?: string
  actual_score?: string
  predicted_result?: string
  predicted_score?: string
  predicted_over_under?: string
  predicted_btts?: string
  outcome_correct?: boolean
  prediction_correct?: boolean
  score_correct?: boolean
  over_under_correct?: boolean
  btts_correct?: boolean
  correct_factors?: string[]
  incorrect_factors?: string[]
  key_insights?: string[]
  lessons_learned?: string[]
  learning_points?: string[]
  unexpected_events?: string[]
  surprises?: string[]
  model_used?: string
  model_version?: string
  analysis_text?: string
  post_match_analysis?: string
  confidence_pct?: number
  factor_accuracy?: Record<string, { accurate?: boolean; correct?: boolean; notes?: string; reasoning?: string }>
  home_team_performance?: Record<string, any>
  away_team_performance?: Record<string, any>
  created_at?: string
}

interface Prediction {
  prediction_result?: string
  overall_index?: number
  certainty_score?: number
  confidence_pct?: number
  most_likely_score?: string
  over_under_2_5?: string
  btts?: string
  factors?: {
    home_win_pct?: number
    draw_pct?: number
    away_win_pct?: number
    over_under?: string
    btts?: string
  }
}

interface PostMatchAnalysisProps {
  analysis: MatchAnalysis | null
  prediction: Prediction | null
  actualResult: { home: number; away: number }
  homeTeamName: string
  awayTeamName: string
}

// Tooltip explanations for each metric
const METRIC_TOOLTIPS = {
  result: "Compares predicted match outcome (1/X/2) vs actual result",
  score: "Compares predicted scoreline vs actual final score",
  overUnder: "Over/Under 2.5 goals - did the match have more or fewer than 2.5 total goals",
  btts: "Both Teams To Score - whether both teams scored in the match",
  postMatch: "Overall analysis accuracy score (0-100%) based on how well predictions matched the actual outcome",
  preMatch: "Original AI confidence level before the match was played",
  homePerf: "Post-match performance metrics and key observations for the home team",
  awayPerf: "Post-match performance metrics and key observations for the away team"
}

function getActualOutcome(home: number, away: number): string {
  if (home > away) return '1'
  if (away > home) return '2'
  return 'X'
}

function getOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case '1': return 'Home Win'
    case 'X': return 'Draw'
    case '2': return 'Away Win'
    default: return outcome
  }
}

// Helper component for metric boxes with help icon
function MetricBox({
  label,
  tooltip,
  children
}: {
  label: string
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-3 h-3 text-muted-foreground/50 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-[200px]">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  )
}

export function PostMatchAnalysis({
  analysis,
  prediction,
  actualResult,
  homeTeamName,
  awayTeamName,
}: PostMatchAnalysisProps) {
  const actualOutcome = getActualOutcome(actualResult.home, actualResult.away)
  const predictedOutcome = prediction?.prediction_result || analysis?.predicted_result
  const wasCorrect = analysis?.prediction_correct ?? (predictedOutcome === actualOutcome)
  const actualScore = `${actualResult.home}-${actualResult.away}`
  const predictedScore = prediction?.most_likely_score || analysis?.predicted_score
  const scoreCorrect = analysis?.score_correct ?? (predictedScore === actualScore)

  // Over/Under check
  const totalGoals = actualResult.home + actualResult.away
  const actualOverUnder = totalGoals > 2.5 ? 'Over' : 'Under'
  const predictedOverUnder = analysis?.predicted_over_under || prediction?.over_under_2_5 || prediction?.factors?.over_under
  const overUnderCorrect = analysis?.over_under_correct ?? (predictedOverUnder === actualOverUnder)

  // BTTS check
  const actualBtts = actualResult.home > 0 && actualResult.away > 0 ? 'Yes' : 'No'
  const predictedBtts = analysis?.predicted_btts || prediction?.btts || prediction?.factors?.btts
  const bttsCorrect = analysis?.btts_correct ?? (predictedBtts === actualBtts)

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Accuracy Banner */}
        <div className={cn(
          "rounded-lg p-4 flex items-center gap-4",
          wasCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
            wasCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
          )}>
            {wasCorrect ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <XCircle className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "font-bold text-lg",
              wasCorrect ? "text-green-600" : "text-red-600"
            )}>
              {wasCorrect ? 'Prediction Correct!' : 'Prediction Incorrect'}
            </h4>
            <p className="text-sm text-muted-foreground">
              Predicted <strong>{getOutcomeLabel(predictedOutcome || '-')}</strong>
              {' • '}Actual: <strong>{homeTeamName} {actualResult.home} - {actualResult.away} {awayTeamName}</strong>
            </p>
          </div>
          {analysis?.accuracy_score !== undefined && (
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <p className={cn(
                "text-2xl font-bold",
                analysis.accuracy_score >= 70 ? "text-green-500" :
                analysis.accuracy_score >= 50 ? "text-amber-500" :
                "text-red-500"
              )}>
                {Math.round(analysis.accuracy_score)}%
              </p>
            </div>
          )}
        </div>

        {/* Accuracy Metrics Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {/* Result */}
          <MetricBox label="Result" tooltip={METRIC_TOOLTIPS.result}>
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm font-medium">{predictedOutcome || '-'}→{actualOutcome}</span>
              {wasCorrect ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          </MetricBox>

          {/* Score */}
          {predictedScore && (
            <MetricBox label="Score" tooltip={METRIC_TOOLTIPS.score}>
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-medium">{predictedScore}→{actualScore}</span>
                {scoreCorrect ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </MetricBox>
          )}

          {/* O/U 2.5 */}
          {predictedOverUnder && (
            <MetricBox label="O/U 2.5" tooltip={METRIC_TOOLTIPS.overUnder}>
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-medium">{predictedOverUnder}</span>
                {overUnderCorrect ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </MetricBox>
          )}

          {/* BTTS */}
          {predictedBtts && (
            <MetricBox label="BTTS" tooltip={METRIC_TOOLTIPS.btts}>
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-medium">{predictedBtts}</span>
                {bttsCorrect ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </MetricBox>
          )}

          {/* Score Index (Factor Points) */}
          {prediction?.overall_index && (
            <MetricBox label="Score Index" tooltip="Weighted factor score (1-100). >50 favors home, <50 favors away, 50 is neutral.">
              <span className={cn(
                "text-lg font-bold",
                (prediction.overall_index || 50) > 55 ? "text-home" :
                (prediction.overall_index || 50) < 45 ? "text-away" : "text-draw"
              )}>
                {prediction.overall_index}
              </span>
            </MetricBox>
          )}

          {/* Pre-Match Confidence */}
          {(prediction?.certainty_score || prediction?.confidence_pct) && (
            <MetricBox label="Confidence" tooltip={METRIC_TOOLTIPS.preMatch}>
              <span className={cn(
                "text-lg font-bold",
                (prediction?.certainty_score || prediction?.confidence_pct || 0) >= 70 ? "text-green-500" :
                (prediction?.certainty_score || prediction?.confidence_pct || 0) >= 50 ? "text-yellow-500" : "text-muted-foreground"
              )}>
                {prediction?.certainty_score || prediction?.confidence_pct}%
              </span>
            </MetricBox>
          )}

          {/* Post-Match Accuracy */}
          {analysis?.accuracy_score !== undefined && (
            <MetricBox label="Accuracy" tooltip={METRIC_TOOLTIPS.postMatch}>
              <span className={cn(
                "text-lg font-bold",
                (analysis.accuracy_score || 0) >= 70 ? "text-green-500" :
                (analysis.accuracy_score || 0) >= 50 ? "text-yellow-500" : "text-red-500"
              )}>
                {Math.round(analysis.accuracy_score)}%
              </span>
            </MetricBox>
          )}
        </div>

        {/* Prediction vs Reality */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h5 className="font-medium text-sm">Predicted</h5>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Result:</span>
                <span className="font-medium">{getOutcomeLabel(predictedOutcome || '-')}</span>
              </div>
              {predictedScore && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-medium">{predictedScore}</span>
                </div>
              )}
              {prediction?.overall_index && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Score Index:</span>
                  <span className={cn(
                    "font-medium",
                    prediction.overall_index > 55 ? "text-home" : prediction.overall_index < 45 ? "text-away" : ""
                  )}>
                    {prediction.overall_index}
                  </span>
                </div>
              )}
              {(prediction?.certainty_score || prediction?.confidence_pct) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className="font-medium">{prediction?.certainty_score || prediction?.confidence_pct}%</span>
                </div>
              )}
              {predictedOverUnder && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">O/U 2.5:</span>
                  <span className="font-medium">{predictedOverUnder}</span>
                </div>
              )}
              {predictedBtts && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BTTS:</span>
                  <span className="font-medium">{predictedBtts}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h5 className="font-medium text-sm">Actual</h5>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Result:</span>
                <span className="font-medium">{getOutcomeLabel(actualOutcome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Score:</span>
                <span className="font-medium">{actualScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Goals:</span>
                <span className={cn(
                  "font-medium",
                  overUnderCorrect && "text-green-500"
                )}>
                  {totalGoals} ({actualOverUnder})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BTTS:</span>
                <span className={cn(
                  "font-medium",
                  bttsCorrect && "text-green-500"
                )}>
                  {actualBtts}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis details from AI */}
        {analysis && (
          <>
            {/* Post-Match Narrative */}
            {analysis.post_match_analysis && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h5 className="font-medium mb-2 text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  Match Analysis
                </h5>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {analysis.post_match_analysis}
                </p>
              </div>
            )}

            {/* Key Insights */}
            {analysis.key_insights && analysis.key_insights.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-blue-500" />
                  <h5 className="font-medium text-blue-600">Key Insights</h5>
                </div>
                <ul className="space-y-2">
                  {analysis.key_insights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-foreground flex gap-2">
                      <span className="text-blue-500 shrink-0">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Learning Points */}
            {(analysis.learning_points || analysis.lessons_learned) &&
             (analysis.learning_points?.length || analysis.lessons_learned?.length) && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <h5 className="font-medium text-purple-600">Learning Points</h5>
                </div>
                <ul className="space-y-2">
                  {(analysis.learning_points || analysis.lessons_learned || []).map((point, idx) => (
                    <li key={idx} className="text-sm text-foreground flex gap-2">
                      <span className="text-purple-500 shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Surprises / Unexpected Events */}
            {(analysis.surprises || analysis.unexpected_events) &&
             (analysis.surprises?.length || analysis.unexpected_events?.length) && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <h5 className="font-medium text-orange-600">Surprises</h5>
                </div>
                <ul className="space-y-2">
                  {(analysis.surprises || analysis.unexpected_events || []).map((item, idx) => (
                    <li key={idx} className="text-sm text-foreground flex gap-2">
                      <span className="text-orange-500 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Factor Accuracy Analysis */}
            {analysis.factor_accuracy && Object.keys(analysis.factor_accuracy).length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h5 className="font-medium">Factor Accuracy</h5>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(analysis.factor_accuracy).map(([factorKey, factorData]: [string, any]) => {
                    const isAccurate = factorData?.accurate ?? factorData?.correct ?? false
                    const notes = factorData?.notes || factorData?.reasoning || ''

                    return (
                      <div
                        key={factorKey}
                        className={cn(
                          "p-3 rounded border text-sm",
                          isAccurate ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{factorKey.charAt(0)}</span>
                          {isAccurate ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {factorKey.replace(/_/g, ' ').replace(/^[A-Z]_/, '')}
                        </p>
                        {notes && (
                          <p className="text-xs text-foreground/70 mt-1">
                            {notes}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Simple Factor accuracy (legacy format) */}
            {!analysis.factor_accuracy && (analysis.correct_factors?.length || analysis.incorrect_factors?.length) && (
              <div className="grid grid-cols-2 gap-4">
                {analysis.correct_factors && analysis.correct_factors.length > 0 && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                    <h6 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Accurate Factors
                    </h6>
                    <ul className="text-xs space-y-1">
                      {analysis.correct_factors.map((factor, idx) => (
                        <li key={idx} className="text-muted-foreground">{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.incorrect_factors && analysis.incorrect_factors.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <h6 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      Inaccurate Factors
                    </h6>
                    <ul className="text-xs space-y-1">
                      {analysis.incorrect_factors.map((factor, idx) => (
                        <li key={idx} className="text-muted-foreground">{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Team Performance Summaries */}
            {(analysis.home_team_performance || analysis.away_team_performance) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.home_team_performance && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-1">
                      {homeTeamName} Performance
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-green-600/50 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px]">{METRIC_TOOLTIPS.homePerf}</p>
                        </TooltipContent>
                      </Tooltip>
                    </h5>

                    {/* Numeric stats in grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm mb-2">
                      {Object.entries(analysis.home_team_performance).map(([key, value]) => {
                        if (key === 'key_stats') return null
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-foreground font-medium">{String(value)}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Key stats as separate block */}
                    {analysis.home_team_performance.key_stats && (
                      <div className="text-xs text-muted-foreground border-t border-green-500/20 pt-2 mt-2">
                        <span className="font-medium text-green-600">Key:</span>{' '}
                        {String(analysis.home_team_performance.key_stats)}
                      </div>
                    )}
                  </div>
                )}

                {analysis.away_team_performance && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-1">
                      {awayTeamName} Performance
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-red-600/50 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px]">{METRIC_TOOLTIPS.awayPerf}</p>
                        </TooltipContent>
                      </Tooltip>
                    </h5>

                    {/* Numeric stats in grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm mb-2">
                      {Object.entries(analysis.away_team_performance).map(([key, value]) => {
                        if (key === 'key_stats') return null
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-foreground font-medium">{String(value)}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Key stats as separate block */}
                    {analysis.away_team_performance.key_stats && (
                      <div className="text-xs text-muted-foreground border-t border-red-500/20 pt-2 mt-2">
                        <span className="font-medium text-red-600">Key:</span>{' '}
                        {String(analysis.away_team_performance.key_stats)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Full analysis text (legacy) */}
            {analysis.analysis_text && !analysis.post_match_analysis && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h5 className="font-medium mb-2 text-sm">Full Analysis</h5>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {analysis.analysis_text}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              {(analysis.model_used || analysis.model_version) && (
                <span>Model: {analysis.model_used || analysis.model_version}</span>
              )}
              {analysis.created_at && (
                <span>Analyzed: {new Date(analysis.created_at).toLocaleString()}</span>
              )}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
