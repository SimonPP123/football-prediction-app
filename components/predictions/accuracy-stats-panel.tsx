'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Target, TrendingUp, CheckCircle, XCircle, Loader2, Crosshair, ChevronDown, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccuracyStats {
  total: number
  correct: number
  incorrect: number
  accuracy: number
  result_accuracy: number
  score_accuracy: number
  over_under_accuracy: number
  btts_accuracy: number
  average_accuracy: number
  scoreIndex?: {
    count: number
    average: number
    correctAvg: number
    incorrectAvg: number
  }
  confidenceStats?: {
    count: number
    average: number
    correctAvg: number
    incorrectAvg: number
  }
  scorePrediction?: {
    total: number
    correct: number
    accuracy: number
    closeAccuracy: number
  }
}

interface AccuracyStatsPanelProps {
  leagueId?: string
}

export function AccuracyStatsPanel({ leagueId }: AccuracyStatsPanelProps) {
  const [stats, setStats] = useState<AccuracyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [leagueId])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const url = leagueId ? `/api/accuracy-stats?league_id=${leagueId}` : '/api/accuracy-stats'
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      console.error('Error fetching accuracy stats:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-card border rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading accuracy stats...
      </div>
    )
  }

  if (error || !stats) {
    return null
  }

  if (stats.total === 0) {
    return (
      <div className="p-4 bg-card border rounded-lg text-sm text-muted-foreground text-center">
        No analyzed matches yet
      </div>
    )
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-green-500'
    if (accuracy >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getAccuracyBg = (accuracy: number) => {
    if (accuracy >= 70) return 'bg-green-500/10 border-green-500/20'
    if (accuracy >= 50) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-red-500/10 border-red-500/20'
  }

  return (
    <div className="p-4 bg-card border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Historical Accuracy
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {stats.total} match{stats.total !== 1 ? 'es' : ''} analyzed
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            {expanded ? 'Less' : 'More'}
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Main accuracy grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Overall Average */}
        <div className={cn(
          "p-3 rounded-lg border text-center",
          getAccuracyBg(stats.average_accuracy)
        )}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className={cn("text-xl font-bold", getAccuracyColor(stats.average_accuracy))}>
            {Math.round(stats.average_accuracy)}%
          </div>
          <div className="text-xs text-muted-foreground">Overall</div>
        </div>

        {/* 1X2 Result */}
        <div className={cn(
          "p-3 rounded-lg border text-center",
          getAccuracyBg(stats.result_accuracy)
        )}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-4 h-4" />
          </div>
          <div className={cn("text-xl font-bold", getAccuracyColor(stats.result_accuracy))}>
            {Math.round(stats.result_accuracy)}%
          </div>
          <div className="text-xs text-muted-foreground">1X2 Result</div>
        </div>

        {/* Exact Score */}
        <div className={cn(
          "p-3 rounded-lg border text-center",
          getAccuracyBg(stats.score_accuracy)
        )}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-sm font-bold">⚽</span>
          </div>
          <div className={cn("text-xl font-bold", getAccuracyColor(stats.score_accuracy))}>
            {Math.round(stats.score_accuracy)}%
          </div>
          <div className="text-xs text-muted-foreground">Exact Score</div>
          {stats.scorePrediction && (
            <div className="text-[10px] text-muted-foreground">
              ({stats.scorePrediction.closeAccuracy}% close)
            </div>
          )}
        </div>

        {/* Over/Under 2.5 */}
        <div className={cn(
          "p-3 rounded-lg border text-center",
          getAccuracyBg(stats.over_under_accuracy)
        )}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs font-medium">O/U</span>
          </div>
          <div className={cn("text-xl font-bold", getAccuracyColor(stats.over_under_accuracy))}>
            {Math.round(stats.over_under_accuracy)}%
          </div>
          <div className="text-xs text-muted-foreground">O/U 2.5</div>
        </div>

        {/* BTTS */}
        <div className={cn(
          "p-3 rounded-lg border text-center",
          getAccuracyBg(stats.btts_accuracy)
        )}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className={cn("text-xl font-bold", getAccuracyColor(stats.btts_accuracy))}>
            {Math.round(stats.btts_accuracy)}%
          </div>
          <div className="text-xs text-muted-foreground">BTTS</div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {/* Score Index & Confidence Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Score Index */}
            {stats.scoreIndex && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  Score Index (Factor Points)
                </h4>
                <p className="text-[10px] text-muted-foreground mb-2">
                  1-100 scale: &gt;50 favors home, &lt;50 favors away, 50 neutral
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className={cn(
                      "text-lg font-bold",
                      stats.scoreIndex.average > 55 ? "text-home" :
                      stats.scoreIndex.average < 45 ? "text-away" : ""
                    )}>
                      {stats.scoreIndex.average}
                    </p>
                    <p className="text-muted-foreground">Average</p>
                  </div>
                  <div>
                    <p className={cn(
                      "text-lg font-bold",
                      stats.scoreIndex.correctAvg > 55 ? "text-home" :
                      stats.scoreIndex.correctAvg < 45 ? "text-away" : "text-green-500"
                    )}>
                      {stats.scoreIndex.correctAvg}
                    </p>
                    <p className="text-muted-foreground">When Correct</p>
                  </div>
                  <div>
                    <p className={cn(
                      "text-lg font-bold",
                      stats.scoreIndex.incorrectAvg > 55 ? "text-home" :
                      stats.scoreIndex.incorrectAvg < 45 ? "text-away" : "text-red-500"
                    )}>
                      {stats.scoreIndex.incorrectAvg}
                    </p>
                    <p className="text-muted-foreground">When Wrong</p>
                  </div>
                </div>
              </div>
            )}

            {/* Confidence */}
            {stats.confidenceStats && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Confidence (AI Certainty %)
                </h4>
                <p className="text-[10px] text-muted-foreground mb-2">
                  How confident the AI was in its predictions
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-lg font-bold">{stats.confidenceStats.average}%</p>
                    <p className="text-muted-foreground">Average</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-500">{stats.confidenceStats.correctAvg}%</p>
                    <p className="text-muted-foreground">When Correct</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-500">{stats.confidenceStats.incorrectAvg}%</p>
                    <p className="text-muted-foreground">When Wrong</p>
                  </div>
                </div>
                {/* Calibration warning */}
                {stats.confidenceStats.incorrectAvg > stats.confidenceStats.correctAvg && (
                  <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-[10px] flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                    <span className="text-orange-600">
                      Calibration issue: AI more confident when wrong
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Correct vs Incorrect Summary */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span><strong className="text-green-500">{stats.correct}</strong> Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span><strong className="text-red-500">{stats.incorrect}</strong> Incorrect</span>
            </div>
            <div className="text-muted-foreground">
              ({stats.accuracy?.toFixed(1)}% accuracy)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
