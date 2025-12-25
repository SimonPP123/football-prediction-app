'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, RefreshCw, History, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScorePrediction {
  score: string
  probability: number
}

interface PredictionCardProps {
  fixture: any
  onGeneratePrediction?: (fixtureId: string, regenerate?: boolean) => void
  isGenerating?: boolean
}

export function PredictionCard({ fixture, onGeneratePrediction, isGenerating }: PredictionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Handle both array and object formats from Supabase
  const prediction = Array.isArray(fixture.prediction)
    ? fixture.prediction[0]
    : fixture.prediction
  const hasPrediction = !!prediction

  // Get score predictions from prediction data
  const scorePredictons: ScorePrediction[] = prediction?.score_predictions || []
  const mostLikelyScore = prediction?.most_likely_score || null

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

        {/* Score Predictions */}
        {hasPrediction && scorePredictons.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Score Predictions</span>
              {mostLikelyScore && (
                <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  Most likely: {mostLikelyScore}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {scorePredictons.slice(0, 5).map((sp, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-center p-1.5 rounded text-xs",
                    sp.score === mostLikelyScore
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50"
                  )}
                >
                  <div className="font-medium">{sp.score}</div>
                  <div className="text-[10px] opacity-75">{sp.probability}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate / Expand Button */}
      <div className="border-t border-border">
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
        ) : (
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
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((h, idx) => (
              <div key={h.id || idx} className="bg-card border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      h.prediction_result === '1' && 'bg-home text-white',
                      h.prediction_result === 'X' && 'bg-draw text-white',
                      h.prediction_result === '2' && 'bg-away text-white'
                    )}>
                      {h.prediction_result || '?'}
                    </span>
                    <span className="text-muted-foreground">
                      {h.confidence_pct || h.overall_index}% confidence
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded">{h.model_used || 'Unknown model'}</span>
                  {h.most_likely_score && (
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">
                      Score: {h.most_likely_score}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
