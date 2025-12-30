'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Target, BarChart3, TrendingUp, Brain } from 'lucide-react'

interface MatchAnalysis {
  id: string
  accuracy_score?: number
  actual_outcome?: string
  outcome_correct?: boolean
  correct_factors?: string[]
  incorrect_factors?: string[]
  key_insights?: string[]
  lessons_learned?: string[]
  unexpected_events?: string[]
  model_used?: string
  analysis_text?: string
  created_at?: string
}

interface Prediction {
  prediction_result?: string
  overall_index?: number
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

export function PostMatchAnalysis({
  analysis,
  prediction,
  actualResult,
  homeTeamName,
  awayTeamName,
}: PostMatchAnalysisProps) {
  const actualOutcome = getActualOutcome(actualResult.home, actualResult.away)
  const predictedOutcome = prediction?.prediction_result
  const wasCorrect = predictedOutcome === actualOutcome

  return (
    <div className="space-y-4">
      {/* Accuracy Banner */}
      <div className={cn(
        "rounded-lg p-4 flex items-center gap-4",
        wasCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          wasCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}>
          {wasCorrect ? (
            <CheckCircle className="w-6 h-6" />
          ) : (
            <XCircle className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1">
          <h4 className={cn(
            "font-bold text-lg",
            wasCorrect ? "text-green-600" : "text-red-600"
          )}>
            {wasCorrect ? 'Prediction Correct!' : 'Prediction Incorrect'}
          </h4>
          <p className="text-sm text-muted-foreground">
            Predicted <strong>{getOutcomeLabel(predictedOutcome || '-')}</strong>
            {' • '}Actual result: <strong>{homeTeamName} {actualResult.home} - {actualResult.away} {awayTeamName}</strong>
          </p>
        </div>
        {analysis?.accuracy_score !== undefined && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Accuracy Score</p>
            <p className={cn(
              "text-2xl font-bold",
              analysis.accuracy_score >= 70 ? "text-green-500" :
              analysis.accuracy_score >= 50 ? "text-amber-500" :
              "text-red-500"
            )}>
              {analysis.accuracy_score}%
            </p>
          </div>
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-medium">{prediction?.overall_index || '-'}%</span>
            </div>
            {prediction?.factors?.over_under && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">O/U:</span>
                <span className="font-medium">{prediction.factors.over_under}</span>
              </div>
            )}
            {prediction?.factors?.btts && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">BTTS:</span>
                <span className="font-medium">{prediction.factors.btts}</span>
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
              <span className="font-medium">{actualResult.home} - {actualResult.away}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Goals:</span>
              <span className={cn(
                "font-medium",
                prediction?.factors?.over_under === 'Over' && actualResult.home + actualResult.away > 2.5 && "text-green-500",
                prediction?.factors?.over_under === 'Under' && actualResult.home + actualResult.away < 2.5 && "text-green-500"
              )}>
                {actualResult.home + actualResult.away}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">BTTS:</span>
              <span className={cn(
                "font-medium",
                prediction?.factors?.btts === 'Yes' && actualResult.home > 0 && actualResult.away > 0 && "text-green-500",
                prediction?.factors?.btts === 'No' && (actualResult.home === 0 || actualResult.away === 0) && "text-green-500"
              )}>
                {actualResult.home > 0 && actualResult.away > 0 ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis details from AI */}
      {analysis && (
        <>
          {/* Key Insights */}
          {analysis.key_insights && analysis.key_insights.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-purple-500" />
                <h5 className="font-medium">Key Insights</h5>
              </div>
              <ul className="space-y-2">
                {analysis.key_insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Factor accuracy */}
          {(analysis.correct_factors?.length || analysis.incorrect_factors?.length) && (
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

          {/* Unexpected events */}
          {analysis.unexpected_events && analysis.unexpected_events.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <h6 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unexpected Events
              </h6>
              <ul className="text-sm space-y-1">
                {analysis.unexpected_events.map((event, idx) => (
                  <li key={idx} className="text-muted-foreground">{event}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Full analysis text */}
          {analysis.analysis_text && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="font-medium mb-2 text-sm">Full Analysis</h5>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {analysis.analysis_text}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            {analysis.model_used && (
              <span>Model: {analysis.model_used}</span>
            )}
            {analysis.created_at && (
              <span>Analyzed: {new Date(analysis.created_at).toLocaleString()}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
