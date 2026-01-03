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

export function SummaryStats({ initialStats, initialSeason }: DashboardStatsProps) {
  // Format season as "YYYY-YY" (e.g., 2025 -> "2025-26")
  const seasonDisplay = initialSeason ? `${initialSeason}-${String(initialSeason + 1).slice(-2)}` : 'N/A'

  return (
    <StatGrid columns={4}>
      <StatCard
        label="Upcoming Matches"
        value={initialStats.upcomingFixtures}
        icon={Calendar}
        color="blue"
        size="sm"
        info="Number of scheduled matches that haven't been played yet"
      />
      <StatCard
        label="Matches Played"
        value={initialStats.completedFixtures}
        icon={CheckCircle2}
        color="green"
        size="sm"
        info="Total number of completed matches this season"
      />
      <StatCard
        label="Predictions Made"
        value={initialStats.totalPredictions}
        icon={Target}
        color="purple"
        size="sm"
        info="Number of AI predictions generated for matches"
      />
      <StatCard
        label="Result Accuracy"
        value={initialStats.resultAccuracy > 0 ? `${initialStats.resultAccuracy.toFixed(1)}%` : 'N/A'}
        icon={TrendingUp}
        color={initialStats.resultAccuracy >= 60 ? 'green' : initialStats.resultAccuracy >= 40 ? 'amber' : 'red'}
        size="sm"
        info="Percentage of predictions where the predicted outcome (Home Win, Draw, Away Win) was correct"
      />
      <StatCard
        label="Matches Analyzed"
        value={initialStats.analyzedMatches}
        icon={BarChart3}
        color="amber"
        size="sm"
        info="Number of completed matches with predictions that have been analyzed for accuracy"
      />
      <StatCard
        label="Average Score"
        value={initialStats.averageAccuracy > 0 ? `${initialStats.averageAccuracy.toFixed(1)}%` : 'N/A'}
        icon={Trophy}
        color={initialStats.averageAccuracy >= 60 ? 'green' : initialStats.averageAccuracy >= 40 ? 'amber' : 'red'}
        size="sm"
        info="Average prediction confidence score across all analyzed matches"
      />
      <StatCard
        label="Teams"
        value={initialStats.totalTeams}
        icon={Users}
        color="default"
        size="sm"
        info="Number of teams in the selected league"
      />
      <StatCard
        label="Season"
        value={seasonDisplay}
        icon={Clock}
        color="default"
        size="sm"
        info="Current season being tracked (format: start year - end year)"
      />
    </StatGrid>
  )
}
