'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, TrendingUp, AlertCircle, Lightbulb, Target, CheckCircle, XCircle, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MatchAnalysis } from '@/types'

interface PostMatchAnalysisSectionProps {
  fixtureId: string
}

export function PostMatchAnalysisSection({ fixtureId }: PostMatchAnalysisSectionProps) {
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Fetch analysis on mount
  useEffect(() => {
    fetchAnalysis()
  }, [fixtureId])

  const fetchAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/match-analysis/${fixtureId}`)

      if (response.status === 404) {
        // Analysis doesn't exist yet - this is normal
        setAnalysis(null)
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analysis')
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (err: any) {
      console.error('Error fetching analysis:', err)
      setError(err.message || 'Failed to load analysis')
    } finally {
      setLoading(false)
    }
  }

  const regenerateAnalysis = async () => {
    setRegenerating(true)
    setError(null)

    try {
      // Delete existing analysis if it exists
      if (analysis) {
        await fetch(`/api/match-analysis/${fixtureId}`, {
          method: 'DELETE'
        })
      }

      // Get custom settings from localStorage if available
      const customWebhookUrl = localStorage.getItem('analysis_webhook_url')
      const webhookSecret = localStorage.getItem('webhook_secret')

      // Generate new analysis
      const response = await fetch('/api/match-analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixture_id: fixtureId,
          force_regenerate: true,
          webhook_url: customWebhookUrl || undefined,
          webhook_secret: webhookSecret || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to regenerate analysis')
      }

      // Wait a moment then refetch
      setTimeout(() => {
        fetchAnalysis()
      }, 2000)
    } catch (err: any) {
      console.error('Error regenerating analysis:', err)
      setError(err.message || 'Failed to regenerate analysis')
    } finally {
      setRegenerating(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading post-match analysis...</span>
        </div>
      </div>
    )
  }

  // No analysis exists
  if (!analysis && !error) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>No post-match analysis available yet</span>
          </div>
          <button
            onClick={regenerateAnalysis}
            disabled={regenerating}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", regenerating && "animate-spin")} />
            {regenerating ? 'Generating...' : 'Generate Analysis'}
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  // Safety check - should not reach here without analysis
  if (!analysis) {
    return null
  }

  // Analysis exists - display it
  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Post-Match Analysis
        </h3>
        <button
          onClick={regenerateAnalysis}
          disabled={regenerating}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3 h-3", regenerating && "animate-spin")} />
          Regenerate
        </button>
      </div>

      {/* Accuracy Summary */}
      <div className="grid grid-cols-3 gap-2">
        {/* Result */}
        <div className="p-2 bg-muted/50 rounded-lg text-center">
          <span className="text-[10px] text-muted-foreground block">Result</span>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-xs font-medium">{analysis.predicted_result}→{analysis.actual_result}</span>
            {analysis.prediction_correct ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>

        {/* Score */}
        {analysis.predicted_score && (
          <div className="p-2 bg-muted/50 rounded-lg text-center">
            <span className="text-[10px] text-muted-foreground block">Score</span>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-xs font-medium">{analysis.predicted_score}→{analysis.actual_score}</span>
              {analysis.score_correct ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
            </div>
          </div>
        )}

        {/* O/U 2.5 */}
        {analysis.predicted_over_under && (
          <div className="p-2 bg-muted/50 rounded-lg text-center">
            <span className="text-[10px] text-muted-foreground block">O/U 2.5</span>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-xs font-medium">{analysis.predicted_over_under}</span>
              {analysis.over_under_correct ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
            </div>
          </div>
        )}

        {/* BTTS */}
        {analysis.predicted_btts && (
          <div className="p-2 bg-muted/50 rounded-lg text-center">
            <span className="text-[10px] text-muted-foreground block">BTTS</span>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-xs font-medium">{analysis.predicted_btts}</span>
              {analysis.btts_correct ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <XCircle className="w-3 h-3 text-red-500" />
              )}
            </div>
          </div>
        )}

        {/* Accuracy Score */}
        <div className="p-2 bg-muted/50 rounded-lg text-center">
          <span className="text-[10px] text-muted-foreground block">Accuracy</span>
          <span className={cn(
            "text-lg font-bold",
            (analysis.accuracy_score || 0) >= 70 ? "text-green-500" :
            (analysis.accuracy_score || 0) >= 50 ? "text-yellow-500" : "text-red-500"
          )}>
            {Math.round(analysis.accuracy_score || 0)}%
          </span>
        </div>

        {/* Original Confidence */}
        {analysis.confidence_pct && (
          <div className="p-2 bg-muted/50 rounded-lg text-center">
            <span className="text-[10px] text-muted-foreground block">Pre-Match</span>
            <span className="text-lg font-medium">{analysis.confidence_pct}%</span>
          </div>
        )}
      </div>

      {/* Expand/Collapse Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-2"
      >
        {expanded ? 'Hide' : 'Show'} Detailed Analysis
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-3">
          {/* Post-Match Narrative */}
          {analysis.post_match_analysis && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Analysis</h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {analysis.post_match_analysis}
              </p>
            </div>
          )}

          {/* Key Insights */}
          {analysis.key_insights && analysis.key_insights.length > 0 && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="text-xs font-medium text-blue-500 mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Key Insights
              </h4>
              <ul className="space-y-1 text-sm">
                {analysis.key_insights.map((insight, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-blue-500">•</span>
                    <span className="text-foreground">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Learning Points */}
          {analysis.learning_points && analysis.learning_points.length > 0 && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <h4 className="text-xs font-medium text-purple-500 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Learning Points
              </h4>
              <ul className="space-y-1 text-sm">
                {analysis.learning_points.map((point, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-purple-500">•</span>
                    <span className="text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Surprises */}
          {analysis.surprises && analysis.surprises.length > 0 && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <h4 className="text-xs font-medium text-orange-500 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Surprises
              </h4>
              <ul className="space-y-1 text-sm">
                {analysis.surprises.map((surprise, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span className="text-foreground">{surprise}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Factor Accuracy Analysis */}
          {analysis.factor_accuracy && Object.keys(analysis.factor_accuracy).length > 0 && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Factor Accuracy
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(analysis.factor_accuracy).map(([factorKey, factorData]: [string, any]) => {
                  const isAccurate = factorData?.accurate ?? factorData?.correct ?? false
                  const notes = factorData?.notes || factorData?.reasoning || ''

                  return (
                    <div
                      key={factorKey}
                      className={cn(
                        "p-2 rounded border text-xs",
                        isAccurate ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{factorKey.charAt(0)}</span>
                        {isAccurate ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {factorKey.replace(/_/g, ' ').replace(/^[A-Z]_/, '')}
                      </p>
                      {notes && (
                        <p className="text-[10px] text-foreground/70 mt-1 line-clamp-2">
                          {notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Team Performance Summaries */}
          {(analysis.home_team_performance || analysis.away_team_performance) && (
            <div className="grid grid-cols-2 gap-2">
              {analysis.home_team_performance && (
                <div className="p-3 bg-home/10 border border-home/20 rounded-lg">
                  <h4 className="text-xs font-medium text-home mb-2">Home Performance</h4>
                  <div className="text-xs space-y-1">
                    {Object.entries(analysis.home_team_performance).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-foreground font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.away_team_performance && (
                <div className="p-3 bg-away/10 border border-away/20 rounded-lg">
                  <h4 className="text-xs font-medium text-away mb-2">Away Performance</h4>
                  <div className="text-xs space-y-1">
                    {Object.entries(analysis.away_team_performance).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-foreground font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Model Info */}
          <div className="text-xs text-muted-foreground text-center pt-2">
            Analyzed with {analysis.model_version || 'AI'} • {new Date(analysis.created_at).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  )
}
