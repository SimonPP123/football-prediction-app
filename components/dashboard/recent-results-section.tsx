'use client'

import { useState, useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from 'react'
import { ResultAccuracyCard } from '@/components/dashboard/result-accuracy-card'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import Link from 'next/link'
import { useLeague } from '@/contexts/league-context'

interface RecentResultsSectionProps {
  initialRecentResults: any[]
  serverLeagueId?: string
}

export interface RecentResultsSectionRef {
  refresh: () => Promise<void>
}

export const RecentResultsSection = forwardRef<RecentResultsSectionRef, RecentResultsSectionProps>(
  function RecentResultsSection({ initialRecentResults, serverLeagueId }, ref) {
    const { currentLeague } = useLeague()
    // Use server-provided league ID until context syncs with URL
    const effectiveLeagueId = currentLeague?.id || serverLeagueId
    const [recentResults, setRecentResults] = useState(initialRecentResults)
    const prevResultCountRef = useRef(initialRecentResults.length)

    const refresh = useCallback(async () => {
      try {
        // Use URL constructor for proper parameter handling
        const url = new URL('/api/fixtures/recent-results', window.location.origin)
        url.searchParams.set('rounds', '2') // Last 2 matchweeks
        if (effectiveLeagueId) {
          url.searchParams.set('league_id', effectiveLeagueId)
        }
        const res = await fetch(url.toString(), { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const newResults = Array.isArray(data) ? data : []

          // Only update if results actually changed (new results or different IDs)
          const newCount = newResults.length
          const prevCount = prevResultCountRef.current

          // Check if there are new results by comparing IDs
          const currentIds = new Set(recentResults.map((r: any) => r.id))
          const hasNewResults = newResults.some((r: any) => !currentIds.has(r.id))

          if (newCount !== prevCount || hasNewResults) {
            setRecentResults(newResults)
            prevResultCountRef.current = newCount
          }
        }
      } catch (error) {
        console.error('Failed to refresh recent results:', error)
      }
    }, [effectiveLeagueId, recentResults])

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
      refresh
    }))

    // Update when league changes
    useEffect(() => {
      refresh()
    }, [effectiveLeagueId])

    // Poll for new results every 60 seconds (catches finished matches that might be missed)
    useEffect(() => {
      const intervalId = setInterval(refresh, 60000)
      return () => clearInterval(intervalId)
    }, [refresh])

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">Recent Results</h2>
            <DataFreshnessBadge category="match-analysis" size="sm" showInfo />
          </div>
          <Link href="/matches" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {recentResults.length === 0 ? (
            <div className="col-span-full bg-card border rounded-lg p-8 text-center text-muted-foreground">
              No recent matches
            </div>
          ) : (
            recentResults.map((match: any) => (
              <ResultAccuracyCard
                key={match.id}
                fixture={match}
                variant="compact"
              />
            ))
          )}
        </div>
      </div>
    )
  }
)
