'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PredictionCardProps {
  fixture: any
  onGeneratePrediction?: (fixtureId: string) => void
  isGenerating?: boolean
}

export function PredictionCard({ fixture, onGeneratePrediction, isGenerating }: PredictionCardProps) {
  const [expanded, setExpanded] = useState(false)

  const prediction = fixture.prediction?.[0]
  const hasPrediction = !!prediction

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
                  style={{ width: `${prediction.factors.home_win_pct || 0}%` }}
                />
              </div>
              <span className="w-8 text-right">{prediction.factors.home_win_pct || 0}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-8">X</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-draw"
                  style={{ width: `${prediction.factors.draw_pct || 0}%` }}
                />
              </div>
              <span className="w-8 text-right">{prediction.factors.draw_pct || 0}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-8">2</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-away"
                  style={{ width: `${prediction.factors.away_win_pct || 0}%` }}
                />
              </div>
              <span className="w-8 text-right">{prediction.factors.away_win_pct || 0}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Generate / Expand Button */}
      <div className="border-t border-border">
        {hasPrediction ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Analysis
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show AI Analysis
              </>
            )}
          </button>
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
            Generated by {prediction.model_version || 'AI'} •
            {prediction.updated_at && ` Updated ${new Date(prediction.updated_at).toLocaleDateString()}`}
          </div>
        </div>
      )}
    </div>
  )
}
