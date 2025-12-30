'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { FormIndicator } from '@/components/stats/form-indicator'
import { Target, Shield, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

interface TeamCardProps {
  team: {
    id: string
    name: string
    logo?: string
    code?: string
  }
  standing?: {
    rank: number
    points: number
    form?: string
    goals_for?: number
    goals_against?: number
    played?: number
  } | null
  stats?: {
    goals_for?: number
    goals_against?: number
    fixtures_played?: number
    clean_sheets?: number
    xg_for?: number
  } | null
  injuryCount?: number
  className?: string
}

export function TeamCard({
  team,
  standing,
  stats,
  injuryCount = 0,
  className,
}: TeamCardProps) {
  // Calculate goals per game
  const gamesPlayed = stats?.fixtures_played || standing?.played || 1
  const goalsFor = stats?.goals_for || standing?.goals_for || 0
  const goalsAgainst = stats?.goals_against || standing?.goals_against || 0
  const goalsPerGame = (goalsFor / gamesPlayed).toFixed(1)
  const concededPerGame = (goalsAgainst / gamesPlayed).toFixed(1)
  const goalDiff = goalsFor - goalsAgainst

  return (
    <Link
      href={`/teams/${team.id}`}
      className={cn(
        "bg-card border border-border rounded-lg p-4 hover:border-primary transition-all group block",
        className
      )}
    >
      {/* Team Header */}
      <div className="flex items-center gap-4">
        {team.logo && (
          <img
            src={team.logo}
            alt={team.name}
            className="w-16 h-16 object-contain group-hover:scale-110 transition-transform"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{team.name}</h3>
          {team.code && (
            <p className="text-sm text-muted-foreground">{team.code}</p>
          )}
          {standing && (
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">
                #{standing.rank}
              </span>
              <span className="text-sm font-medium">
                {standing.points} pts
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      {standing?.form && (
        <div className="mt-3">
          <FormIndicator form={standing.form} size="sm" maxResults={5} />
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Target className="w-3 h-3 text-green-500" />
            <span className="text-sm font-bold">{goalsPerGame}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Goals/G</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-blue-500" />
            <span className="text-sm font-bold">{concededPerGame}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Conc/G</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            {goalDiff >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={cn(
              "text-sm font-bold",
              goalDiff > 0 ? "text-green-500" : goalDiff < 0 ? "text-red-500" : ""
            )}>
              {goalDiff > 0 ? '+' : ''}{goalDiff}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">GD</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <AlertTriangle className={cn(
              "w-3 h-3",
              injuryCount > 3 ? "text-red-500" : injuryCount > 0 ? "text-amber-500" : "text-green-500"
            )} />
            <span className={cn(
              "text-sm font-bold",
              injuryCount > 3 ? "text-red-500" : injuryCount > 0 ? "text-amber-500" : "text-green-500"
            )}>
              {injuryCount}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Injuries</p>
        </div>
      </div>

      {/* xG indicator if available */}
      {stats?.xg_for !== undefined && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">xG</span>
            <span className="font-medium">{stats.xg_for.toFixed(1)}</span>
          </div>
        </div>
      )}
    </Link>
  )
}
