'use client'

import { cn } from '@/lib/utils'
import { StatCard } from '@/components/stats/stat-card'
import {
  Target,
  Shield,
  TrendingUp,
  TrendingDown,
  Crosshair,
  Users,
  Home,
  Plane,
} from 'lucide-react'

interface TeamStats {
  fixtures_played?: number
  wins?: number
  draws?: number
  losses?: number
  goals_for?: number
  goals_against?: number
  clean_sheets?: number
  failed_to_score?: number
  xg_for?: number
  xg_against?: number
  home_wins?: number
  home_draws?: number
  home_losses?: number
  away_wins?: number
  away_draws?: number
  away_losses?: number
  avg_goals_scored?: number
  avg_goals_conceded?: number
  possession_avg?: number
}

interface TeamStatsDashboardProps {
  stats: TeamStats | null
  className?: string
}

export function TeamStatsDashboard({ stats, className }: TeamStatsDashboardProps) {
  if (!stats) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No statistics available for this team
      </div>
    )
  }

  const gamesPlayed = stats.fixtures_played || 1
  const goalsPerGame = stats.goals_for ? (stats.goals_for / gamesPlayed).toFixed(2) : '0.00'
  const concededPerGame = stats.goals_against ? (stats.goals_against / gamesPlayed).toFixed(2) : '0.00'
  const goalDiff = (stats.goals_for || 0) - (stats.goals_against || 0)
  const xgDiff = stats.xg_for && stats.xg_against ? stats.xg_for - stats.xg_against : null
  const xgPerformance = stats.xg_for && stats.goals_for ? stats.goals_for - stats.xg_for : null

  // Calculate win percentage
  const winPct = stats.wins ? ((stats.wins / gamesPlayed) * 100).toFixed(0) : '0'

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Matches"
          value={stats.fixtures_played || 0}
          icon={Users}
          description={`${winPct}% win rate`}
        />
        <StatCard
          label="Goals"
          value={stats.goals_for || 0}
          icon={Target}
          description={`${goalsPerGame}/game`}
          trend={goalDiff > 0 ? 'up' : goalDiff < 0 ? 'down' : 'neutral'}
        />
        <StatCard
          label="Conceded"
          value={stats.goals_against || 0}
          icon={Shield}
          description={`${concededPerGame}/game`}
        />
        <StatCard
          label="Goal Diff"
          value={goalDiff > 0 ? `+${goalDiff}` : goalDiff}
          icon={goalDiff >= 0 ? TrendingUp : TrendingDown}
          color={goalDiff > 0 ? 'green' : goalDiff < 0 ? 'red' : 'default'}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Clean Sheets"
          value={stats.clean_sheets || 0}
          icon={Shield}
          description={stats.fixtures_played ? `${((stats.clean_sheets || 0) / gamesPlayed * 100).toFixed(0)}%` : undefined}
          color="green"
        />
        <StatCard
          label="Failed to Score"
          value={stats.failed_to_score || 0}
          icon={Crosshair}
          description={stats.fixtures_played ? `${((stats.failed_to_score || 0) / gamesPlayed * 100).toFixed(0)}%` : undefined}
          color="red"
        />
        {stats.xg_for !== undefined && (
          <StatCard
            label="xG"
            value={stats.xg_for?.toFixed(1) || '0.0'}
            icon={Target}
            description={xgPerformance !== null ? `${xgPerformance >= 0 ? '+' : ''}${xgPerformance.toFixed(1)} vs actual` : undefined}
          />
        )}
        {stats.xg_against !== undefined && (
          <StatCard
            label="xG Against"
            value={stats.xg_against?.toFixed(1) || '0.0'}
            icon={Shield}
          />
        )}
      </div>

      {/* Home vs Away */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="font-medium mb-4 text-sm">Home vs Away Performance</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* Home */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Home className="w-4 h-4 text-green-500" />
              <span>Home</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {stats.home_wins || 0}
                  </span>
                  <span className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {stats.home_draws || 0}
                  </span>
                  <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {stats.home_losses || 0}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">W-D-L</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                {(() => {
                  const homeTotal = (stats.home_wins || 0) + (stats.home_draws || 0) + (stats.home_losses || 0) || 1
                  return (
                    <>
                      <div className="bg-green-500 h-full" style={{ width: `${((stats.home_wins || 0) / homeTotal) * 100}%` }} />
                      <div className="bg-gray-500 h-full" style={{ width: `${((stats.home_draws || 0) / homeTotal) * 100}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${((stats.home_losses || 0) / homeTotal) * 100}%` }} />
                    </>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Away */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plane className="w-4 h-4 text-blue-500" />
              <span>Away</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {stats.away_wins || 0}
                  </span>
                  <span className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {stats.away_draws || 0}
                  </span>
                  <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {stats.away_losses || 0}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">W-D-L</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                {(() => {
                  const awayTotal = (stats.away_wins || 0) + (stats.away_draws || 0) + (stats.away_losses || 0) || 1
                  return (
                    <>
                      <div className="bg-green-500 h-full" style={{ width: `${((stats.away_wins || 0) / awayTotal) * 100}%` }} />
                      <div className="bg-gray-500 h-full" style={{ width: `${((stats.away_draws || 0) / awayTotal) * 100}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${((stats.away_losses || 0) / awayTotal) * 100}%` }} />
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
