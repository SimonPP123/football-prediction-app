'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { useLeague } from '@/contexts/league-context'

interface LiveMatchesSectionProps {
  initialLiveFixtures: any[]
  onMatchesFinished?: () => void
  serverLeagueId?: string
}

// Helper to check if fixture data actually changed (not just reference)
function fixturesChanged(oldFixtures: any[], newFixtures: any[]): boolean {
  if (oldFixtures.length !== newFixtures.length) return true
  for (let i = 0; i < newFixtures.length; i++) {
    const oldF = oldFixtures.find((f: any) => f.id === newFixtures[i].id)
    if (!oldF) return true
    // Check if score or status changed (the important live data)
    if (oldF.goals_home !== newFixtures[i].goals_home ||
        oldF.goals_away !== newFixtures[i].goals_away ||
        oldF.status !== newFixtures[i].status) {
      return true
    }
  }
  return false
}

function LiveMatchesSectionComponent({
  initialLiveFixtures,
  onMatchesFinished,
  serverLeagueId,
}: LiveMatchesSectionProps) {
  const { currentLeague } = useLeague()
  // Use server-provided league ID until context syncs with URL
  const effectiveLeagueId = currentLeague?.id || serverLeagueId
  const [liveFixtures, setLiveFixtures] = useState(initialLiveFixtures)
  const liveFixtureIdsRef = useRef<Set<string>>(new Set(initialLiveFixtures.map((m: any) => m.id)))
  // Use ref for callback to avoid effect re-runs when parent doesn't memoize
  const onMatchesFinishedRef = useRef(onMatchesFinished)
  onMatchesFinishedRef.current = onMatchesFinished

  // Track the league ID to detect changes
  const prevLeagueIdRef = useRef(effectiveLeagueId)

  // Auto-refresh live fixtures every 60 seconds
  useEffect(() => {
    const refreshLive = async () => {
      try {
        // Use URL constructor for proper parameter handling
        const url = new URL('/api/fixtures/live', window.location.origin)
        if (effectiveLeagueId) {
          url.searchParams.set('league_id', effectiveLeagueId)
        }
        const res = await fetch(url.toString(), { credentials: 'include' })
        if (res.ok) {
          const newLiveData = await res.json()
          const newLiveFixtures = Array.isArray(newLiveData) ? newLiveData : []

          // Check if any previously live matches are no longer live (finished)
          const currentLiveIds = new Set(newLiveFixtures.map((m: any) => m.id))
          const hasFinishedMatches = Array.from(liveFixtureIdsRef.current).some(id => !currentLiveIds.has(id))

          // Update ref with current live fixture IDs
          liveFixtureIdsRef.current = currentLiveIds

          // Always update when league changed, otherwise only if data changed
          const leagueChanged = prevLeagueIdRef.current !== effectiveLeagueId
          prevLeagueIdRef.current = effectiveLeagueId

          setLiveFixtures(prev => {
            if (leagueChanged || fixturesChanged(prev, newLiveFixtures)) {
              return newLiveFixtures
            }
            return prev
          })

          // Notify parent if matches finished (use ref to avoid dependency)
          if (hasFinishedMatches && onMatchesFinishedRef.current) {
            onMatchesFinishedRef.current()
          }
        }
      } catch (error) {
        console.error('Failed to refresh live fixtures:', error)
      }
    }

    // Initial refresh
    refreshLive()

    const intervalId = setInterval(refreshLive, 60000) // Refresh every 60 seconds

    return () => clearInterval(intervalId)
  }, [effectiveLeagueId]) // Use effective league ID (context or server-provided)

  if (liveFixtures.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <h2 className="font-semibold text-lg text-red-500">Live Now</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {liveFixtures.length} match{liveFixtures.length > 1 ? 'es' : ''} in progress
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {liveFixtures.map((fixture: any) => (
          <PredictionCard
            key={fixture.id}
            fixture={fixture}
            isLive={true}
          />
        ))}
      </div>
    </div>
  )
}

// Wrap with React.memo to prevent unnecessary re-renders
export const LiveMatchesSection = memo(LiveMatchesSectionComponent)
