'use client'

import { StatCard } from '@/components/stats/stat-card'
import { StatGrid } from '@/components/stats/stat-grid'
import {
  Calendar,
  CheckCircle2,
  Target,
  Users,
  TrendingUp,
  BarChart3,
  Trophy,
  Clock,
} from 'lucide-react'

interface DashboardStatsProps {
  stats: {
    totalFixtures: number
    completedFixtures: number
    upcomingFixtures: number
    totalPredictions: number
    analyzedMatches: number
    totalTeams: number
    resultAccuracy: number
    averageAccuracy: number
  }
  season?: number // e.g., 2025 for "2025-26" season
}

export function SummaryStats({ stats, season }: DashboardStatsProps) {
  // Format season as "YYYY-YY" (e.g., 2025 -> "2025-26")
  const seasonDisplay = season ? `${season}-${String(season + 1).slice(-2)}` : 'N/A'

  return (
    <StatGrid columns={4}>
      <StatCard
        label="Upcoming Matches"
        value={stats.upcomingFixtures}
        icon={Calendar}
        color="blue"
        size="sm"
      />
      <StatCard
        label="Matches Played"
        value={stats.completedFixtures}
        icon={CheckCircle2}
        color="green"
        size="sm"
      />
      <StatCard
        label="Predictions Made"
        value={stats.totalPredictions}
        icon={Target}
        color="purple"
        size="sm"
      />
      <StatCard
        label="Result Accuracy"
        value={stats.resultAccuracy > 0 ? `${stats.resultAccuracy.toFixed(1)}%` : 'N/A'}
        icon={TrendingUp}
        color={stats.resultAccuracy >= 60 ? 'green' : stats.resultAccuracy >= 40 ? 'amber' : 'red'}
        size="sm"
      />
      <StatCard
        label="Matches Analyzed"
        value={stats.analyzedMatches}
        icon={BarChart3}
        color="amber"
        size="sm"
      />
      <StatCard
        label="Average Score"
        value={stats.averageAccuracy > 0 ? `${stats.averageAccuracy.toFixed(1)}%` : 'N/A'}
        icon={Trophy}
        color={stats.averageAccuracy >= 60 ? 'green' : stats.averageAccuracy >= 40 ? 'amber' : 'red'}
        size="sm"
      />
      <StatCard
        label="Teams"
        value={stats.totalTeams}
        icon={Users}
        color="default"
        size="sm"
      />
      <StatCard
        label="Season"
        value={seasonDisplay}
        icon={Clock}
        color="default"
        size="sm"
      />
    </StatGrid>
  )
}
