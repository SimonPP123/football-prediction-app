'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostMatchAnalysisSection } from './post-match-analysis-section'

interface RecentResultCardProps {
  fixture: any
}

export function RecentResultCard({ fixture }: RecentResultCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Handle both array and object formats from Supabase
  const prediction = Array.isArray(fixture.prediction)
    ? fixture.prediction[0]
    : fixture.prediction

  // Determine actual result from goals
  const getActualResult = (): '1' | 'X' | '2' | null => {
    if (fixture.goals_home === null || fixture.goals_away === null) return null
    if (fixture.goals_home > fixture.goals_away) return '1'
    if (fixture.goals_home < fixture.goals_away) return '2'
    return 'X'
  }

  const actualResult = getActualResult()
  const predictedResult = prediction?.prediction_result
  const wasCorrect = actualResult && predictedResult && actualResult === predictedResult

  // Check score prediction accuracy
  const actualScore = `${fixture.goals_home}-${fixture.goals_away}`
  const predictedScore = prediction?.most_likely_score
  const scoreCorrect = predictedScore === actualScore

  // BTTS check
  const actualBtts = fixture.goals_home > 0 && fixture.goals_away > 0
  const predictedBtts = prediction?.btts === 'Yes' || prediction?.factors?.btts === 'Yes'
  const bttsCorrect = actualBtts === predictedBtts

  // Over/Under 2.5 check
  const totalGoals = (fixture.goals_home || 0) + (fixture.goals_away || 0)
  const actualOverUnder = totalGoals > 2.5 ? 'Over' : 'Under'
  const predictedOverUnder = prediction?.over_under_2_5 || prediction?.factors?.over_under
  const overUnderCorrect = actualOverUnder === predictedOverUnder

  const getResultBadgeColor = (result: string | null) => {
    switch (result) {
      case '1': return 'bg-home text-white'
      case 'X': return 'bg-draw text-white'
      case '2': return 'bg-away text-white'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const confidence = prediction?.overall_index || prediction?.confidence_pct || 0

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
            })}
          </span>
        </div>

        {/* Teams and Score */}
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
            <p className={cn(
              "font-medium text-sm",
              actualResult === '1' && "text-green-500"
            )}>
              {fixture.home_team?.name || 'TBD'}
            </p>
          </div>

          {/* Final Score */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">
              {fixture.goals_home} - {fixture.goals_away}
            </div>
            <span className="text-xs text-muted-foreground mt-1">FT</span>
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
            <p className={cn(
              "font-medium text-sm",
              actualResult === '2' && "text-green-500"
            )}>
              {fixture.away_team?.name || 'TBD'}
            </p>
          </div>
        </div>

        {/* Prediction Comparison */}
        {prediction ? (
          <div className="mt-4 space-y-3">
            {/* Main Result Comparison */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Prediction:</span>
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                  getResultBadgeColor(predictedResult)
                )}>
                  {predictedResult || '?'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({confidence}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {wasCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  wasCorrect ? "text-green-500" : "text-red-500"
                )}>
                  {wasCorrect ? 'Correct' : 'Wrong'}
                </span>
              </div>
            </div>

            {/* Secondary Predictions */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {/* Score Prediction */}
              {predictedScore && (
                <div className={cn(
                  "p-2 rounded",
                  scoreCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50"
                )}>
                  <p className="text-muted-foreground mb-1">Score</p>
                  <div className="flex items-center justify-center gap-1">
                    <Target className="w-3 h-3" />
                    <span className="font-medium">{predictedScore}</span>
                    {scoreCorrect && <CheckCircle className="w-3 h-3 text-green-500" />}
                  </div>
                </div>
              )}

              {/* O/U 2.5 */}
              {predictedOverUnder && (
                <div className={cn(
                  "p-2 rounded",
                  overUnderCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50"
                )}>
                  <p className="text-muted-foreground mb-1">O/U 2.5</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-medium">{predictedOverUnder}</span>
                    {overUnderCorrect ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
              )}

              {/* BTTS */}
              {(prediction.btts || prediction.factors?.btts) && (
                <div className={cn(
                  "p-2 rounded",
                  bttsCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50"
                )}>
                  <p className="text-muted-foreground mb-1">BTTS</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-medium">
                      {prediction.btts || prediction.factors?.btts}
                    </span>
                    {bttsCorrect ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Expand/Collapse Analysis */}
            {prediction.analysis_text && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-2"
              >
                {expanded ? 'Hide' : 'Show'} Analysis
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {expanded && prediction.analysis_text && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                {prediction.analysis_text}
              </div>
            )}

            {/* Post-Match Analysis */}
            <PostMatchAnalysisSection fixtureId={fixture.id} />

            {/* Model info */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Predicted with {prediction.model_used || prediction.model_version || 'AI'}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
            No prediction was made for this match
          </div>
        )}
      </div>
    </div>
  )
}
