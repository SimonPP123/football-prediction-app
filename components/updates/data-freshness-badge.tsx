'use client'

import { useState } from 'react'
import { useUpdates } from './update-provider'
import { DataCategory } from '@/types'
import { cn } from '@/lib/utils'
import { Clock, Loader2, Info } from 'lucide-react'

// Category descriptions for info tooltips
const CATEGORY_INFO: Record<DataCategory, { name: string; description: string; refreshFrequency: string }> = {
  fixtures: {
    name: 'Fixtures',
    description: 'Match schedule, kick-off times, and venue information',
    refreshFrequency: 'Updated daily or when new fixtures are announced',
  },
  standings: {
    name: 'Standings',
    description: 'League table including points, goals, and form',
    refreshFrequency: 'Updated after each matchday',
  },
  injuries: {
    name: 'Injuries',
    description: 'Player injury status and expected return dates',
    refreshFrequency: 'Updated daily before matches',
  },
  odds: {
    name: 'Betting Odds',
    description: 'Pre-match odds from multiple bookmakers',
    refreshFrequency: 'Updated every 4 hours on matchdays',
  },
  weather: {
    name: 'Weather',
    description: 'Match day weather conditions at venues',
    refreshFrequency: 'Updated daily and before kick-off',
  },
  predictions: {
    name: 'Predictions',
    description: 'AI-generated match predictions with factor analysis',
    refreshFrequency: 'Generated on-demand before matches',
  },
  'team-stats': {
    name: 'Team Stats',
    description: 'Season statistics including xG, shots, possession',
    refreshFrequency: 'Updated weekly',
  },
  'player-stats': {
    name: 'Player Stats',
    description: 'Individual player performance statistics',
    refreshFrequency: 'Updated weekly',
  },
  lineups: {
    name: 'Lineups',
    description: 'Confirmed starting XI and formations',
    refreshFrequency: 'Available ~1 hour before kick-off',
  },
  'match-analysis': {
    name: 'Match Analysis',
    description: 'Post-match AI analysis comparing predictions to results',
    refreshFrequency: 'Generated after match completion',
  },
  'top-performers': {
    name: 'Top Performers',
    description: 'Top scorers, assists, and cards statistics',
    refreshFrequency: 'Updated weekly',
  },
}

// Color legend for freshness
const FRESHNESS_LEGEND = [
  { color: 'bg-green-500', label: 'Fresh', description: 'Updated within 1 hour' },
  { color: 'bg-amber-500', label: 'Recent', description: 'Updated 1-4 hours ago' },
  { color: 'bg-orange-500', label: 'Aging', description: 'Updated 4-24 hours ago' },
  { color: 'bg-red-500', label: 'Stale', description: 'Updated over 24 hours ago' },
]

interface DataFreshnessBadgeProps {
  category: DataCategory
  className?: string
  showLabel?: boolean
  showInfo?: boolean
  size?: 'sm' | 'md'
}

function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getFreshnessColor(dateString: string | undefined): string {
  if (!dateString) return 'text-muted-foreground bg-muted'

  const date = new Date(dateString)
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / 3600000

  if (diffHours < 1) return 'text-green-600 bg-green-500/10'
  if (diffHours < 4) return 'text-amber-600 bg-amber-500/10'
  if (diffHours < 24) return 'text-orange-600 bg-orange-500/10'
  return 'text-red-600 bg-red-500/10'
}

export function DataFreshnessBadge({
  category,
  className,
  showLabel = true,
  showInfo = false,
  size = 'sm',
}: DataFreshnessBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const { lastRefreshTimes, isRefreshing } = useUpdates()
  const lastRefresh = lastRefreshTimes[category]
  const isLoading = isRefreshing[category]
  const info = CATEGORY_INFO[category]

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
  }

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center rounded font-medium",
          sizeClasses[size],
          getFreshnessColor(lastRefresh),
          className
        )}
        title={lastRefresh ? `Last updated: ${new Date(lastRefresh).toLocaleString()}` : 'Never updated'}
      >
        {isLoading ? (
          <Loader2 className={cn(iconSizes[size], "animate-spin")} />
        ) : (
          <Clock className={iconSizes[size]} />
        )}
        {showLabel && (
          <span>{formatRelativeTime(lastRefresh)}</span>
        )}
      </span>

      {showInfo && (
        <button
          className="p-0.5 rounded hover:bg-muted transition-colors"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <Info className={cn(iconSizes[size], "text-muted-foreground")} />
        </button>
      )}

      {/* Info Tooltip */}
      {showTooltip && showInfo && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-card border rounded-lg shadow-lg p-3 text-xs">
          <div className="font-medium mb-1">{info.name}</div>
          <p className="text-muted-foreground mb-2">{info.description}</p>
          <div className="text-[10px] text-muted-foreground border-t pt-2">
            <span className="font-medium">Refresh:</span> {info.refreshFrequency}
          </div>
          {lastRefresh && (
            <div className="text-[10px] text-muted-foreground mt-1">
              <span className="font-medium">Last:</span> {new Date(lastRefresh).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Standalone component for showing freshness legend
export function FreshnessLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-xs", className)}>
      <span className="text-muted-foreground">Freshness:</span>
      {FRESHNESS_LEGEND.map((item) => (
        <div key={item.label} className="flex items-center gap-1" title={item.description}>
          <div className={cn("w-2 h-2 rounded-full", item.color)} />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// Component for data status row with info
export function DataStatusRow({
  category,
  className,
}: {
  category: DataCategory
  className?: string
}) {
  const info = CATEGORY_INFO[category]

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{info.name}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {info.description}
        </span>
      </div>
      <DataFreshnessBadge category={category} size="md" showInfo />
    </div>
  )
}
