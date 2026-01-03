'use client'

import { useEffect, useState, useRef } from 'react'
import { useLeague } from '@/contexts/league-context'
import { SummaryStats } from './summary-stats'
import { QuickInsights } from './quick-insights'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import Link from 'next/link'

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

interface DashboardData {
  stats: DashboardStats
  upcomingFixtures: any[]
  topStandings: any[]
  bestFactor: {
    factor: string
    accuracy: number
    total: number
  } | null
}

interface DashboardContentProps {
  initialData: DashboardData
  initialSeason?: number
}

export function DashboardContent({ initialData, initialSeason }: DashboardContentProps) {
  const { currentLeague } = useLeague()
  const [data, setData] = useState<DashboardData>(initialData)
  const [season, setSeason] = useState<number | undefined>(initialSeason)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Refetch all dashboard data when league changes
  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const fetchData = async () => {
      if (!currentLeague?.id) return

      try {
        const res = await fetch(
          `/api/dashboard/stats?league_id=${currentLeague.id}`,
          { signal: abortControllerRef.current?.signal }
        )
        if (res.ok) {
          const newData = await res.json()
          setData(newData)
          setSeason(currentLeague.currentSeason)
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to fetch dashboard data:', err)
        }
      }
    }

    fetchData()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [currentLeague?.id, currentLeague?.currentSeason])

  return (
    <>
      {/* Summary Stats */}
      <SummaryStats initialStats={data.stats} initialSeason={season} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Matches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">Upcoming Matches</h2>
              <DataFreshnessBadge category="fixtures" size="sm" showInfo />
            </div>
            <Link href="/predictions" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>

          {data.upcomingFixtures.length === 0 ? (
            <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
              No upcoming matches scheduled
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.upcomingFixtures.map((fixture: any) => (
                <PredictionCard
                  key={fixture.id}
                  fixture={fixture}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Insights */}
          <QuickInsights
            bestFactor={data.bestFactor}
            resultAccuracy={data.stats.resultAccuracy}
            totalAnalyzed={data.stats.analyzedMatches}
          />

          {/* Mini Standings */}
          <div className="bg-card border rounded-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">League Table</h2>
                <DataFreshnessBadge category="standings" size="sm" showInfo />
              </div>
              <Link href="/standings" className="text-sm text-primary hover:underline">
                Full Table
              </Link>
            </div>
            <div className="p-4">
              {data.topStandings.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  Standings not available
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-xs">
                      <th className="text-left pb-2">#</th>
                      <th className="text-left pb-2">Team</th>
                      <th className="text-center pb-2">P</th>
                      <th className="text-center pb-2">GD</th>
                      <th className="text-center pb-2">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topStandings.map((standing: any) => (
                      <tr key={standing.id} className="border-t border-border/50">
                        <td className="py-2 font-medium">{standing.rank}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {standing.team?.logo && (
                              <img
                                src={standing.team.logo}
                                alt={standing.team.name}
                                className="w-5 h-5 object-contain"
                              />
                            )}
                            <span className="text-sm truncate max-w-[100px]">
                              {standing.team?.code || standing.team?.name?.slice(0, 3) || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-center">{standing.played}</td>
                        <td className="py-2 text-center">
                          <span
                            className={
                              standing.goal_diff > 0
                                ? 'text-green-500'
                                : standing.goal_diff < 0
                                ? 'text-red-500'
                                : ''
                            }
                          >
                            {standing.goal_diff > 0 ? '+' : ''}
                            {standing.goal_diff}
                          </span>
                        </td>
                        <td className="py-2 text-center font-bold">{standing.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
