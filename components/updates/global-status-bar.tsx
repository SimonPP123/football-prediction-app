'use client'

import { useState } from 'react'
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
  Info,
  HelpCircle,
} from 'lucide-react'

const CATEGORY_CONFIG: Record<DataCategory, {
  label: string
  icon: typeof Calendar
  color: string
  description: string
  refreshFrequency: string
}> = {
  fixtures: {
    label: 'Fixtures',
    icon: Calendar,
    color: 'text-blue-500',
    description: 'Match schedule, kick-off times, and venue info',
    refreshFrequency: 'Daily or when new fixtures announced',
  },
  standings: {
    label: 'Standings',
    icon: Trophy,
    color: 'text-amber-500',
    description: 'League table with points, goals, and form',
    refreshFrequency: 'After each matchday',
  },
  injuries: {
    label: 'Injuries',
    icon: AlertTriangle,
    color: 'text-red-500',
    description: 'Player injury status and return dates',
    refreshFrequency: 'Daily before matches',
  },
  odds: {
    label: 'Odds',
    icon: DollarSign,
    color: 'text-green-500',
    description: 'Pre-match odds from multiple bookmakers',
    refreshFrequency: 'Every 4 hours on matchdays',
  },
  weather: {
    label: 'Weather',
    icon: CloudRain,
    color: 'text-cyan-500',
    description: 'Match day weather conditions',
    refreshFrequency: 'Daily and before kick-off',
  },
  predictions: {
    label: 'Predictions',
    icon: Target,
    color: 'text-purple-500',
    description: 'AI-generated match predictions',
    refreshFrequency: 'Generated on-demand',
  },
  'team-stats': {
    label: 'Team Stats',
    icon: BarChart3,
    color: 'text-indigo-500',
    description: 'Season statistics (xG, shots, possession)',
    refreshFrequency: 'Weekly',
  },
  'player-stats': {
    label: 'Player Stats',
    icon: Users,
    color: 'text-pink-500',
    description: 'Individual player performance stats',
    refreshFrequency: 'Weekly',
  },
  lineups: {
    label: 'Lineups',
    icon: UserCheck,
    color: 'text-orange-500',
    description: 'Confirmed starting XI and formations',
    refreshFrequency: '~1 hour before kick-off',
  },
  'match-analysis': {
    label: 'Analysis',
    icon: Brain,
    color: 'text-emerald-500',
    description: 'Post-match AI analysis of predictions',
    refreshFrequency: 'After match completion',
  },
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
  if (diffHours < 24) return 'text-orange-500'
  return 'text-red-500'
}

function StatusItem({ category }: { category: DataCategory }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const { lastRefreshTimes, isRefreshing, refreshCategory } = useUpdates()

  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon
  const lastRefresh = lastRefreshTimes[category]
  const isLoading = isRefreshing[category]

  return (
    <div className="relative flex items-center">
      <button
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

      {/* Info icon */}
      <button
        className="p-0.5 rounded hover:bg-muted transition-colors ml-0.5"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => {
          e.stopPropagation()
          setShowTooltip(!showTooltip)
        }}
      >
        <Info className="w-2.5 h-2.5 text-muted-foreground" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-card border rounded-lg shadow-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn("w-4 h-4", config.color)} />
            <span className="font-medium">{config.label}</span>
          </div>
          <p className="text-muted-foreground mb-2">{config.description}</p>
          <div className="text-[10px] text-muted-foreground border-t pt-2 space-y-1">
            <div>
              <span className="font-medium">Refresh:</span> {config.refreshFrequency}
            </div>
            {lastRefresh && (
              <div>
                <span className="font-medium">Last:</span> {new Date(lastRefresh).toLocaleString()}
              </div>
            )}
          </div>
          <div className="text-[10px] text-primary mt-2 pt-2 border-t">
            Click the badge to refresh this data
          </div>
        </div>
      )}
    </div>
  )
}

export function GlobalStatusBar() {
  const [showLegend, setShowLegend] = useState(false)
  const { isRefreshing } = useUpdates()
  const anyRefreshing = Object.values(isRefreshing).some(Boolean)

  return (
    <div className="bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-1 px-4 py-1.5 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <RefreshCw className={cn("w-3 h-3", anyRefreshing && "animate-spin")} />
          <span className="font-medium">Last updated:</span>
        </div>

        <div className="flex items-center gap-2 ml-2">
          {VISIBLE_CATEGORIES.map(category => (
            <StatusItem key={category} category={category} />
          ))}
        </div>

        {/* Legend button */}
        <div className="relative ml-auto shrink-0">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted/50 transition-colors"
            onMouseEnter={() => setShowLegend(true)}
            onMouseLeave={() => setShowLegend(false)}
            onClick={() => setShowLegend(!showLegend)}
          >
            <HelpCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Legend</span>
          </button>

          {showLegend && (
            <div className="absolute top-full right-0 mt-1 z-50 w-48 bg-card border rounded-lg shadow-lg p-3 text-xs">
              <div className="font-medium mb-2">Color Legend</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Fresh (&lt;1 hour)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Recent (1-4 hours)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-muted-foreground">Aging (4-24 hours)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Stale (&gt;24 hours)</span>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t">
                Click any badge to refresh that data category
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
