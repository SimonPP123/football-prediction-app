'use client'

import { useRef, useCallback } from 'react'
import { LiveMatchesSection } from './live-matches-section'
import { RecentResultsSection, RecentResultsSectionRef } from './recent-results-section'

interface DashboardLiveResultsWrapperProps {
  initialLiveFixtures: any[]
  initialRecentResults: any[]
  leagueId?: string
  children?: React.ReactNode
}

export function DashboardLiveResultsWrapper({
  initialLiveFixtures,
  initialRecentResults,
  leagueId,
  children,
}: DashboardLiveResultsWrapperProps) {
  const resultsRef = useRef<RecentResultsSectionRef>(null)

  const handleMatchesFinished = useCallback(() => {
    // When live matches finish, refresh the results section
    resultsRef.current?.refresh()
  }, [])

  return (
    <>
      {/* Live Matches Section */}
      <LiveMatchesSection
        initialLiveFixtures={initialLiveFixtures}
        onMatchesFinished={handleMatchesFinished}
        serverLeagueId={leagueId}
      />

      {/* Content between live and results (Upcoming + Sidebar) */}
      {children}

      {/* Recent Results Section */}
      <RecentResultsSection
        ref={resultsRef}
        initialRecentResults={initialRecentResults}
        serverLeagueId={leagueId}
      />
    </>
  )
}
