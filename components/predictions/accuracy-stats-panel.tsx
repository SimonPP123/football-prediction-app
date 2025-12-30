'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Target, TrendingUp, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccuracyStats {
  total: number
  result_accuracy: number
  score_accuracy: number
  over_under_accuracy: number
  btts_accuracy: number
  average_accuracy: number
}

export function AccuracyStatsPanel() {
  const [stats, setStats] = useState<AccuracyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/accuracy-stats', { credentials: 'include' })
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
        <span className="text-sm text-muted-foreground">
          {stats.total} match{stats.total !== 1 ? 'es' : ''} analyzed
        </span>
      </div>

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
    </div>
  )
}
