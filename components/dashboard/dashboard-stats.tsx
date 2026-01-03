'use client'

import { useEffect, useState, useRef } from 'react'
import { useLeague } from '@/contexts/league-context'
import { SummaryStats } from './summary-stats'

interface DashboardStats {
  totalFixtures: number
  completedFixtures: number
  upcomingFixtures: number
  totalPredictions: number
  analyzedMatches: number
  totalTeams: number
  resultAccuracy: number
  averageAccuracy: number
}

interface DashboardStatsProps {
  initialStats: DashboardStats
  initialSeason?: number
}

export function DashboardStats({ initialStats, initialSeason }: DashboardStatsProps) {
  const { currentLeague } = useLeague()
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [season, setSeason] = useState<number | undefined>(initialSeason)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const fetchStats = async () => {
      if (!currentLeague?.id) return

      try {
        const res = await fetch(
          `/api/dashboard/stats?league_id=${currentLeague.id}`,
          { signal: abortControllerRef.current?.signal }
        )
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
          setSeason(currentLeague.currentSeason)
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to fetch dashboard stats:', err)
        }
      }
    }

    fetchStats()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [currentLeague?.id, currentLeague?.currentSeason])

  return <SummaryStats initialStats={stats} initialSeason={season} />
}
