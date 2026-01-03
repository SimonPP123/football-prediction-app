'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'

interface ResultAccuracyCardProps {
  fixture: {
    id: string
    match_date: string
    goals_home?: number | null
    goals_away?: number | null
    home_team?: { id: string; name: string; logo?: string; code?: string }
    away_team?: { id: string; name: string; logo?: string; code?: string }
    prediction?: Array<{
      prediction_result?: string
      confidence_pct?: number
    }>
    match_analysis?: Array<{
      prediction_correct?: boolean
      score_correct?: boolean
      accuracy_score?: number
    }>
  }
  variant?: 'compact' | 'detailed'
  className?: string
}

function getActualResult(goalsHome: number | null | undefined, goalsAway: number | null | undefined): string | null {
  if (goalsHome === null || goalsHome === undefined || goalsAway === null || goalsAway === undefined) {
    return null
  }
  if (goalsHome > goalsAway) return '1'
  if (goalsHome < goalsAway) return '2'
  return 'X'
}

export function ResultAccuracyCard({
  fixture,
  variant = 'compact',
  className,
}: ResultAccuracyCardProps) {
  const prediction = fixture.prediction?.[0]
  const analysis = fixture.match_analysis?.[0]
  const actualResult = getActualResult(fixture.goals_home, fixture.goals_away)

  // Check if prediction was correct (supports double-chance: 1X, X2, 12)
  const isPredictionCorrect = (predicted: string | undefined, actual: string | null): boolean | null => {
    if (!predicted || !actual) return null
    // Direct match or double-chance match (e.g., "1X" includes "1" or "X")
    return predicted === actual || predicted.includes(actual)
  }

  const wasCorrect = analysis?.prediction_correct ?? isPredictionCorrect(prediction?.prediction_result, actualResult)

  if (variant === 'compact') {
    return (
      <Link
        href={`/matches/${fixture.id}`}
        className={cn(
          'block bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors',
          className
        )}
      >
        <div className="text-xs text-muted-foreground mb-2">
          {new Date(fixture.match_date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          {fixture.home_team?.logo && (
            <img src={fixture.home_team.logo} alt={fixture.home_team.name} className="w-6 h-6" />
          )}
          <span className="font-bold text-lg">
            {fixture.goals_home ?? '-'} - {fixture.goals_away ?? '-'}
          </span>
          {fixture.away_team?.logo && (
            <img src={fixture.away_team.logo} alt={fixture.away_team.name} className="w-6 h-6" />
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center mb-2">
          {fixture.home_team?.code || fixture.home_team?.name?.slice(0, 3)} vs{' '}
          {fixture.away_team?.code || fixture.away_team?.name?.slice(0, 3)}
        </div>

        {/* Prediction Accuracy Badge */}
        {prediction && (
          <div className="flex items-center justify-center gap-2">
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded flex items-center gap-1',
                wasCorrect === true
                  ? 'bg-green-500/10 text-green-600'
                  : wasCorrect === false
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {wasCorrect === true ? (
                <CheckCircle className="w-3 h-3" />
              ) : wasCorrect === false ? (
                <XCircle className="w-3 h-3" />
              ) : (
                <HelpCircle className="w-3 h-3" />
              )}
              Pred: {prediction.prediction_result}
            </span>
          </div>
        )}
      </Link>
    )
  }

  // Detailed variant
  return (
    <Link
      href={`/matches/${fixture.id}`}
      className={cn(
        'block bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">
          {new Date(fixture.match_date).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </span>
        {analysis?.accuracy_score !== undefined && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded',
              analysis.accuracy_score >= 70
                ? 'bg-green-500/10 text-green-600'
                : analysis.accuracy_score >= 40
                ? 'bg-amber-500/10 text-amber-600'
                : 'bg-red-500/10 text-red-600'
            )}
          >
            {analysis.accuracy_score}% accuracy
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-sm font-medium text-right">
            {fixture.home_team?.name || 'TBD'}
          </span>
          {fixture.home_team?.logo && (
            <img
              src={fixture.home_team.logo}
              alt={fixture.home_team.name}
              className="w-8 h-8 object-contain"
            />
          )}
        </div>

        {/* Score */}
        <div className="text-center">
          <div className="font-bold text-xl">
            {fixture.goals_home ?? '-'} - {fixture.goals_away ?? '-'}
          </div>
          {actualResult && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Result: {actualResult === '1' ? 'Home' : actualResult === '2' ? 'Away' : 'Draw'}
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-2 flex-1">
          {fixture.away_team?.logo && (
            <img
              src={fixture.away_team.logo}
              alt={fixture.away_team.name}
              className="w-8 h-8 object-contain"
            />
          )}
          <span className="text-sm font-medium">
            {fixture.away_team?.name || 'TBD'}
          </span>
        </div>
      </div>

      {/* Prediction Details */}
      {prediction && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Predicted:</span>
            <span
              className={cn(
                'font-medium px-2 py-0.5 rounded',
                prediction.prediction_result === '1'
                  ? 'bg-green-500/10 text-green-600'
                  : prediction.prediction_result === 'X'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-red-500/10 text-red-600'
              )}
            >
              {prediction.prediction_result === '1'
                ? 'Home Win'
                : prediction.prediction_result === 'X'
                ? 'Draw'
                : 'Away Win'}
            </span>
            {prediction.confidence_pct && (
              <span className="text-muted-foreground">
                ({prediction.confidence_pct}% conf)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {wasCorrect === true ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">Correct</span>
              </>
            ) : wasCorrect === false ? (
              <>
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-600 font-medium">Wrong</span>
              </>
            ) : null}
          </div>
        </div>
      )}
    </Link>
  )
}
