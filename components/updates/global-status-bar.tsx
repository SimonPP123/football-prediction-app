'use client'

import { useUpdates } from './update-provider'
import { DataCategory } from '@/types'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Trophy,
  AlertTriangle,
  DollarSign,
  CloudRain,
  Target,
  BarChart3,
  Users,
  UserCheck,
  Brain,
  Loader2,
  RefreshCw,
} from 'lucide-react'

const CATEGORY_CONFIG: Record<DataCategory, { label: string; icon: typeof Calendar; color: string }> = {
  fixtures: { label: 'Fixtures', icon: Calendar, color: 'text-blue-500' },
  standings: { label: 'Standings', icon: Trophy, color: 'text-amber-500' },
  injuries: { label: 'Injuries', icon: AlertTriangle, color: 'text-red-500' },
  odds: { label: 'Odds', icon: DollarSign, color: 'text-green-500' },
  weather: { label: 'Weather', icon: CloudRain, color: 'text-cyan-500' },
  predictions: { label: 'Predictions', icon: Target, color: 'text-purple-500' },
  'team-stats': { label: 'Team Stats', icon: BarChart3, color: 'text-indigo-500' },
  'player-stats': { label: 'Player Stats', icon: Users, color: 'text-pink-500' },
  lineups: { label: 'Lineups', icon: UserCheck, color: 'text-orange-500' },
  'match-analysis': { label: 'Analysis', icon: Brain, color: 'text-emerald-500' },
}

// Categories to show in the status bar (most important ones)
const VISIBLE_CATEGORIES: DataCategory[] = [
  'fixtures',
  'standings',
  'injuries',
  'odds',
  'predictions',
  'match-analysis',
]

function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getStatusColor(dateString: string | undefined): string {
  if (!dateString) return 'text-muted-foreground'

  const date = new Date(dateString)
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / 3600000

  if (diffHours < 1) return 'text-green-500'
  if (diffHours < 4) return 'text-amber-500'
  return 'text-muted-foreground'
}

export function GlobalStatusBar() {
  const { lastRefreshTimes, isRefreshing, refreshCategory } = useUpdates()

  const anyRefreshing = Object.values(isRefreshing).some(Boolean)

  return (
    <div className="bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <RefreshCw className={cn("w-3 h-3", anyRefreshing && "animate-spin")} />
          <span className="font-medium">Last updated:</span>
        </div>

        <div className="flex items-center gap-3 ml-2">
          {VISIBLE_CATEGORIES.map(category => {
            const config = CATEGORY_CONFIG[category]
            const Icon = config.icon
            const lastRefresh = lastRefreshTimes[category]
            const isLoading = isRefreshing[category]

            return (
              <button
                key={category}
                onClick={() => refreshCategory(category)}
                disabled={isLoading}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-0.5 rounded hover:bg-muted/50 transition-colors",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
                title={`Click to refresh ${config.label}`}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Icon className={cn("w-3 h-3", config.color)} />
                )}
                <span className="text-muted-foreground">{config.label}:</span>
                <span className={getStatusColor(lastRefresh)}>
                  {formatRelativeTime(lastRefresh)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
