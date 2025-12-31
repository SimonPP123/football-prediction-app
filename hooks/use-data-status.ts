'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Match phase types
 */
export type MatchPhase =
  | 'no-matches'
  | 'week-before'
  | 'day-before'
  | 'matchday-morning'
  | 'pre-match'
  | 'imminent'
  | 'live'
  | 'post-match'
  | 'day-after'

/**
 * Phase display information
 */
export interface PhaseDisplay {
  title: string
  subtitle: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  icon: string
}

/**
 * Refresh recommendation
 */
export interface PhaseRecommendation {
  required: string[]
  optional: string[]
  skip: string[]
  nextCheckMinutes: number
  description: string
}

/**
 * Data source status
 */
export interface DataSourceStatus {
  name: string
  displayName: string
  lastRefresh: string | null
  recordCount: number
  needsRefresh: boolean
  status: 'fresh' | 'stale' | 'missing' | 'ok'
  reason?: string
}

/**
 * Full data status response
 */
export interface DataStatus {
  league: string
  leagueId: string
  generatedAt: string
  phase: {
    current: MatchPhase
    display: PhaseDisplay
    nextCheckMinutes: number
    recommendation: PhaseRecommendation
  }
  fixtures: {
    total: number
    completed: number
    upcoming: number
    live: number
    missingStats: number
    missingEvents: number
    missingLineups: number
  }
  dataSources: DataSourceStatus[]
  upcomingMatches: {
    id: string
    matchDate: string
    status: string
    homeTeam?: { name: string; logo?: string }
    awayTeam?: { name: string; logo?: string }
  }[]
}

/**
 * Smart refresh result
 */
export interface SmartRefreshResult {
  success: boolean
  league: string
  phase: MatchPhase
  display: PhaseDisplay
  refreshed: string[]
  skipped: string[]
  results: {
    endpoint: string
    success: boolean
    duration: number
    details?: any
    error?: string
  }[]
  summary: {
    total: number
    successful: number
    failed: number
    duration: number
  }
  nextCheckMinutes: number
}

/**
 * Hook for fetching and managing data status
 */
export function useDataStatus(leagueId: string | undefined) {
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!leagueId) return

    try {
      setLoading(true)
      const res = await fetch(`/api/data/status?league_id=${leagueId}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch status: ${res.status}`)
      }

      const data = await res.json()
      setStatus(data)
      setLastFetch(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Auto-refresh based on phase
  useEffect(() => {
    if (!status) return

    const intervalMs = status.phase.nextCheckMinutes * 60 * 1000
    // Minimum 1 minute, maximum 30 minutes
    const clampedInterval = Math.max(60000, Math.min(intervalMs, 1800000))

    const interval = setInterval(fetchStatus, clampedInterval)
    return () => clearInterval(interval)
  }, [status?.phase.nextCheckMinutes, fetchStatus])

  return {
    status,
    loading,
    error,
    lastFetch,
    refetch: fetchStatus,
  }
}

/**
 * Hook for executing smart refresh
 */
export function useSmartRefresh(leagueId: string | undefined) {
  const [refreshing, setRefreshing] = useState(false)
  const [result, setResult] = useState<SmartRefreshResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const executeSmartRefresh = useCallback(
    async (options?: { includeOptional?: boolean; dryRun?: boolean }) => {
      if (!leagueId) return null

      try {
        setRefreshing(true)
        setError(null)

        const params = new URLSearchParams({ league_id: leagueId })
        if (options?.includeOptional) {
          params.set('include_optional', 'true')
        }
        if (options?.dryRun) {
          params.set('dry_run', 'true')
        }

        const res = await fetch(`/api/data/refresh/smart?${params}`, {
          method: 'POST',
          credentials: 'include',
        })

        if (!res.ok) {
          throw new Error(`Smart refresh failed: ${res.status}`)
        }

        const data = await res.json()
        setResult(data)
        return data
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        return null
      } finally {
        setRefreshing(false)
      }
    },
    [leagueId]
  )

  return {
    refreshing,
    result,
    error,
    executeSmartRefresh,
  }
}

/**
 * Get urgency color classes
 */
export function getUrgencyClasses(urgency: PhaseDisplay['urgency']): {
  bg: string
  text: string
  border: string
} {
  switch (urgency) {
    case 'critical':
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-200',
      }
    case 'high':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-200',
      }
    case 'medium':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
      }
    case 'low':
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
      }
  }
}

/**
 * Format time until next match
 */
export function formatTimeUntil(hours: number | null): string {
  if (hours === null) return 'No upcoming matches'

  if (hours < 0) {
    return 'Match in progress'
  }

  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}m away`
  }

  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m away` : `${h}h away`
  }

  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} away`
}
