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
  BarChart3,
  Users,
  UserCheck,
  Loader2,
  ChevronDown,
  Settings,
  Info,
  Square,
} from 'lucide-react'
import { usePollerSettings, PollerSettingsPanel } from './update-poller'
import { LeagueSelector } from '@/components/layout/league-selector'
import { useLeague } from '@/contexts/league-context'

const CATEGORY_CONFIG: Record<string, {
  label: string
  icon: typeof Calendar
  color: string
  bgColor: string
  description: string
  tooltip: string
}> = {
  fixtures: {
    label: 'Fixtures',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    description: 'Match schedule and venues',
    tooltip: 'Upcoming and past match schedules with venues, kickoff times, and scores. Source: API-Football.',
  },
  standings: {
    label: 'Standings',
    icon: Trophy,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    description: 'League table',
    tooltip: 'Current Premier League standings including points, goal difference, and form. Source: API-Football.',
  },
  injuries: {
    label: 'Injuries',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    description: 'Player injuries',
    tooltip: 'Current player injuries and suspensions affecting squad availability. Source: API-Football.',
  },
  odds: {
    label: 'Odds',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    description: 'Betting odds',
    tooltip: 'Latest betting odds from multiple bookmakers for upcoming matches. Source: The Odds API.',
  },
  'team-stats': {
    label: 'Team Stats',
    icon: BarChart3,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500',
    description: 'Team statistics',
    tooltip: 'Detailed team performance metrics including xG, shots, passes, and defensive stats. Source: API-Football.',
  },
  'player-stats': {
    label: 'Player Stats',
    icon: Users,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500',
    description: 'Player statistics',
    tooltip: 'Individual player performance data and statistics for the season.',
  },
  lineups: {
    label: 'Lineups',
    icon: UserCheck,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    description: 'Starting XI',
    tooltip: 'Confirmed starting lineups and formations. Available ~1hr before kickoff. Source: API-Football.',
  },
  'top-performers': {
    label: 'Top Performers',
    icon: Trophy,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    description: 'Top scorers & assists',
    tooltip: 'League top scorers, assist leaders, and card statistics. Source: API-Football.',
  },
}

const VISIBLE_CATEGORIES: DataCategory[] = [
  'fixtures',
  'standings',
  'injuries',
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

// Compact version for mobile header
export function MobileDataStatus() {
  const [showDropdown, setShowDropdown] = useState(false)
  const { lastRefreshTimes, isRefreshing, refreshCategory } = useUpdates()
  const { currentLeague } = useLeague()
  const anyRefreshing = Object.values(isRefreshing).some(Boolean)

  const allCategories = Object.keys(CATEGORY_CONFIG) as DataCategory[]
  const syncedCount = allCategories.filter(c => lastRefreshTimes[c]).length
  const freshCount = allCategories.filter(c => {
    const last = lastRefreshTimes[c]
    if (!last) return false
    return (Date.now() - new Date(last).getTime()) < 3600000
  }).length

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 text-xs hover:bg-muted/50 rounded px-2 py-2 min-h-[44px] transition-colors"
      >
        {anyRefreshing ? (
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
        ) : (
          <div className="flex items-center gap-0.5">
            {VISIBLE_CATEGORIES.map(category => {
              const { color } = getStatusInfo(lastRefreshTimes[category])
              return (
                <div
                  key={category}
                  className={cn("w-1.5 h-1.5 rounded-full", color)}
                />
              )
            })}
          </div>
        )}
        <span className="text-muted-foreground whitespace-nowrap">
          {freshCount}/{syncedCount}
        </span>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full right-0 mt-2 z-50 w-72 max-w-[calc(100vw-1rem)] bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border bg-muted/30">
              <span className="font-medium text-xs">Data Status</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {allCategories.map(category => {
                const config = CATEGORY_CONFIG[category]
                const Icon = config.icon
                const lastRefresh = lastRefreshTimes[category]
                const { color, status } = getStatusInfo(lastRefresh)
                const loading = isRefreshing[category]

                return (
                  <button
                    key={category}
                    onClick={() => refreshCategory(category, currentLeague?.id, currentLeague?.name)}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-2 py-2 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", color)} />
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", config.color)} />
                    )}
                    <span className="text-xs font-medium flex-1">{config.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(lastRefresh)}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="p-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground text-center">
              Refresh for {currentLeague?.name || 'current league'}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function GlobalStatusBar() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { lastRefreshTimes, isRefreshing, refreshCategory, stopAllRefreshes } = useUpdates()
  const { currentLeague } = useLeague()
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
        {/* Left: League selector + Data status summary */}
        <div className="flex items-center gap-4">
          <LeagueSelector />
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
                    <div>
                      <span className="font-medium text-sm">Data Status</span>
                      <p className="text-xs text-muted-foreground">
                        {currentLeague?.name || 'Loading...'}
                      </p>
                    </div>
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
                        onClick={() => refreshCategory(category, currentLeague?.id, currentLeague?.name)}
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{config.label}</span>
                            <span title={config.tooltip} className="cursor-help">
                              <Info className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
                            </span>
                          </div>
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
                <div className="p-2 border-t border-border bg-muted/30 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Click to refresh for {currentLeague?.name || 'current league'}
                  </span>
                  {anyRefreshing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        stopAllRefreshes()
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      Stop
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          </div>
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
