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
  ChevronDown,
  Settings,
} from 'lucide-react'
import { usePollerSettings, PollerSettingsPanel } from './update-poller'

const CATEGORY_CONFIG: Record<DataCategory, {
  label: string
  icon: typeof Calendar
  color: string
  bgColor: string
  description: string
}> = {
  fixtures: {
    label: 'Fixtures',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    description: 'Match schedule and venues',
  },
  standings: {
    label: 'Standings',
    icon: Trophy,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    description: 'League table',
  },
  injuries: {
    label: 'Injuries',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    description: 'Player injuries',
  },
  odds: {
    label: 'Odds',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    description: 'Betting odds',
  },
  weather: {
    label: 'Weather',
    icon: CloudRain,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500',
    description: 'Match weather',
  },
  predictions: {
    label: 'Predictions',
    icon: Target,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    description: 'AI predictions',
  },
  'team-stats': {
    label: 'Team Stats',
    icon: BarChart3,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500',
    description: 'Team statistics',
  },
  'player-stats': {
    label: 'Player Stats',
    icon: Users,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500',
    description: 'Player statistics',
  },
  lineups: {
    label: 'Lineups',
    icon: UserCheck,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    description: 'Starting XI',
  },
  'match-analysis': {
    label: 'Analysis',
    icon: Brain,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    description: 'Post-match analysis',
  },
  'top-performers': {
    label: 'Top Performers',
    icon: Trophy,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    description: 'Top scorers & assists',
  },
}

const VISIBLE_CATEGORIES: DataCategory[] = [
  'fixtures',
  'standings',
  'injuries',
  'predictions',
]

function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'Never'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getStatusInfo(dateString: string | undefined): { color: string; status: string } {
  if (!dateString) return { color: 'bg-muted', status: 'Never synced' }

  const date = new Date(dateString)
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / 3600000

  if (diffHours < 1) return { color: 'bg-green-500', status: 'Fresh' }
  if (diffHours < 4) return { color: 'bg-amber-500', status: 'Recent' }
  if (diffHours < 24) return { color: 'bg-orange-500', status: 'Aging' }
  return { color: 'bg-red-500', status: 'Stale' }
}

export function GlobalStatusBar() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { lastRefreshTimes, isRefreshing, refreshCategory } = useUpdates()
  const { settings } = usePollerSettings()
  const anyRefreshing = Object.values(isRefreshing).some(Boolean)

  // Calculate overall status
  const allCategories = Object.keys(CATEGORY_CONFIG) as DataCategory[]
  const syncedCount = allCategories.filter(c => lastRefreshTimes[c]).length
  const freshCount = allCategories.filter(c => {
    const last = lastRefreshTimes[c]
    if (!last) return false
    return (Date.now() - new Date(last).getTime()) < 3600000
  }).length

  return (
    <div className="bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Data status summary */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors"
          >
            {anyRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <div className="flex items-center gap-1">
                {VISIBLE_CATEGORIES.map(category => {
                  const { color } = getStatusInfo(lastRefreshTimes[category])
                  return (
                    <div
                      key={category}
                      className={cn("w-2 h-2 rounded-full", color)}
                      title={CATEGORY_CONFIG[category].label}
                    />
                  )
                })}
              </div>
            )}
            <span className="text-muted-foreground">
              {freshCount}/{syncedCount} fresh
            </span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform",
              showDropdown && "rotate-180"
            )} />
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-1 z-50 w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Data Status</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" /> Fresh
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> Recent
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Stale
                      </span>
                    </div>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {allCategories.map(category => {
                    const config = CATEGORY_CONFIG[category]
                    const Icon = config.icon
                    const lastRefresh = lastRefreshTimes[category]
                    const { color, status } = getStatusInfo(lastRefresh)
                    const loading = isRefreshing[category]

                    return (
                      <button
                        key={category}
                        onClick={() => refreshCategory(category)}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                      >
                        <div className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Icon className={cn("w-4 h-4 shrink-0", config.color)} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{config.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {config.description}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-medium">{status}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(lastRefresh)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="p-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground text-center">
                  Click any item to refresh
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Auto-refresh toggle */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "flex items-center gap-1.5 text-sm px-2 py-1 rounded-lg transition-colors",
              settings.enabled
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Auto-refresh</span>
            {settings.enabled && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </button>

          {showSettings && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSettings(false)}
              />
              <div className="absolute top-full right-0 mt-1 z-50 w-72 bg-card border rounded-lg shadow-lg p-4">
                <PollerSettingsPanel />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
