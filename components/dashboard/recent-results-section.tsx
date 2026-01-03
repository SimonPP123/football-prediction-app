'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { ResultAccuracyCard } from '@/components/dashboard/result-accuracy-card'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import Link from 'next/link'
import { useLeague } from '@/contexts/league-context'

interface RecentResultsSectionProps {
  initialRecentResults: any[]
}

export interface RecentResultsSectionRef {
  refresh: () => Promise<void>
}

export const RecentResultsSection = forwardRef<RecentResultsSectionRef, RecentResultsSectionProps>(
  function RecentResultsSection({ initialRecentResults }, ref) {
    const { currentLeague } = useLeague()
    const [recentResults, setRecentResults] = useState(initialRecentResults)

    const refresh = async () => {
      try {
        // Use URL constructor for proper parameter handling
        const url = new URL('/api/fixtures/recent-results', window.location.origin)
        url.searchParams.set('rounds', '2') // Last 2 matchweeks
        if (currentLeague?.id) {
          url.searchParams.set('league_id', currentLeague.id)
        }
        const res = await fetch(url.toString(), { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setRecentResults(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Failed to refresh recent results:', error)
      }
    }

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
      refresh
    }))

    // Update when league changes
    useEffect(() => {
      refresh()
    }, [currentLeague?.id])

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
