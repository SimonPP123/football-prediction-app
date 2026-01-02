'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { useLeague } from '@/contexts/league-context'

interface LiveMatchesSectionProps {
  initialLiveFixtures: any[]
  onMatchesFinished?: () => void
}

export function LiveMatchesSection({
  initialLiveFixtures,
  onMatchesFinished,
}: LiveMatchesSectionProps) {
  const { currentLeague } = useLeague()
  const [liveFixtures, setLiveFixtures] = useState(initialLiveFixtures)
  const liveFixtureIdsRef = useRef<Set<string>>(new Set(initialLiveFixtures.map((m: any) => m.id)))

  // Auto-refresh live fixtures every 60 seconds
  useEffect(() => {
    const refreshLive = async () => {
      try {
        const params = currentLeague?.id ? `?league_id=${currentLeague.id}` : ''
        const res = await fetch(`/api/fixtures/live${params}`, { credentials: 'include' })
        if (res.ok) {
          const newLiveData = await res.json()
          const newLiveFixtures = Array.isArray(newLiveData) ? newLiveData : []

          // Check if any previously live matches are no longer live (finished)
          const currentLiveIds = new Set(newLiveFixtures.map((m: any) => m.id))
          const hasFinishedMatches = Array.from(liveFixtureIdsRef.current).some(id => !currentLiveIds.has(id))

          // Update ref with current live fixture IDs
          liveFixtureIdsRef.current = currentLiveIds
          setLiveFixtures(newLiveFixtures)

          // Notify parent if matches finished
          if (hasFinishedMatches && onMatchesFinished) {
            onMatchesFinished()
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
  }, [currentLeague?.id, onMatchesFinished])

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
