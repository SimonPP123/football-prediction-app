'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

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
                    {prediction?.analysis_text && (
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
              )
            })}
          </tbody>
        </table>

        {/* Expanded Analysis Rows */}
        {results.map((fixture) => {
          const prediction = Array.isArray(fixture.prediction)
            ? fixture.prediction[0]
            : fixture.prediction
          const isExpanded = expandedId === fixture.id

          if (!isExpanded || !prediction?.analysis_text) return null

          return (
            <div
              key={`${fixture.id}-expanded`}
              className="p-4 bg-muted/30 border-t border-border"
            >
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Analysis:</strong>
              </p>
              <p className="text-sm">{prediction.analysis_text}</p>
              {prediction.model_used && (
                <p className="text-xs text-muted-foreground mt-2">
                  Model: {prediction.model_used}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
