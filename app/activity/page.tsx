'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { useUpdates } from '@/components/updates/update-provider'
import { DataCategory, RefreshEvent } from '@/types'
import { cn } from '@/lib/utils'
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Trash2,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  Trophy,
  Users,
  CloudRain,
  Target,
  BarChart3,
  Clock,
} from 'lucide-react'

const CATEGORY_ICONS: Record<DataCategory, typeof Activity> = {
  fixtures: Calendar,
  standings: Trophy,
  injuries: Users,
  odds: TrendingUp,
  weather: CloudRain,
  predictions: Target,
  'team-stats': BarChart3,
  'player-stats': Users,
  lineups: Users,
  'match-analysis': Activity,
}

const CATEGORY_LABELS: Record<DataCategory, string> = {
  fixtures: 'Fixtures',
  standings: 'Standings',
  injuries: 'Injuries',
  odds: 'Odds',
  weather: 'Weather',
  predictions: 'Predictions',
  'team-stats': 'Team Stats',
  'player-stats': 'Player Stats',
  lineups: 'Lineups',
  'match-analysis': 'Match Analysis',
}

const STATUS_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const STATUS_COLORS = {
  success: 'text-green-500 bg-green-500/10',
  error: 'text-red-500 bg-red-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  info: 'text-blue-500 bg-blue-500/10',
}

type FilterType = 'all' | DataCategory | 'refresh' | 'prediction' | 'analysis'

export default function ActivityPage() {
  const { refreshHistory, lastRefreshTimes, clearHistory } = useUpdates()
  const [filter, setFilter] = useState<FilterType>('all')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Filter events
  const filteredEvents = refreshHistory.filter((event) => {
    if (filter === 'all') return true
    if (filter === 'refresh' || filter === 'prediction' || filter === 'analysis') {
      return event.type === filter
    }
    return event.category === filter
  })

  // Group events by date
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = new Date(event.timestamp).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {} as Record<string, RefreshEvent[]>)

  // Calculate stats
  const todayEvents = refreshHistory.filter(
    (e) => new Date(e.timestamp).toDateString() === new Date().toDateString()
  )
  const successCount = todayEvents.filter((e) => e.status === 'success').length
  const errorCount = todayEvents.filter((e) => e.status === 'error').length
  const successRate = todayEvents.length > 0 ? (successCount / todayEvents.length) * 100 : 100

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Activity' },
    { value: 'refresh', label: 'Data Refreshes' },
    { value: 'prediction', label: 'Predictions' },
    { value: 'analysis', label: 'Match Analysis' },
    { value: 'fixtures', label: 'Fixtures' },
    { value: 'standings', label: 'Standings' },
    { value: 'predictions', label: 'Predictions Data' },
    { value: 'match-analysis', label: 'Analysis Data' },
  ]

  return (
    <div className="min-h-screen">
      <Header title="Activity Feed" subtitle="Track all data updates and system activity" />

      <div className="p-6 space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Today&apos;s Activity</p>
            <p className="text-2xl font-bold">{todayEvents.length}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Successful</p>
            <p className="text-2xl font-bold text-green-500">{successCount}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Errors</p>
            <p className="text-2xl font-bold text-red-500">{errorCount}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p
              className={cn(
                'text-2xl font-bold',
                successRate >= 90 ? 'text-green-500' : successRate >= 70 ? 'text-amber-500' : 'text-red-500'
              )}
            >
              {successRate.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Last Refresh Times Summary */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last Update Times
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(lastRefreshTimes).map(([category, time]) => {
              const Icon = CATEGORY_ICONS[category as DataCategory] || Activity
              const label = CATEGORY_LABELS[category as DataCategory] || category

              return (
                <div key={category} className="flex items-center gap-2 text-sm">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="font-medium">
                      {time
                        ? new Date(time).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filter and Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full transition-colors',
                  filter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {showClearConfirm ? (
              <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg">
                <span className="text-sm text-red-500">Clear all history?</span>
                <button
                  onClick={() => {
                    clearHistory()
                    setShowClearConfirm(false)
                  }}
                  className="px-2 py-0.5 text-xs bg-red-500 text-white rounded"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 text-xs bg-muted rounded"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-muted rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                Clear History
              </button>
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-6">
          {Object.keys(groupedEvents).length === 0 ? (
            <div className="bg-card border rounded-lg p-12 text-center">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Activity Yet</h3>
              <p className="text-sm text-muted-foreground">
                Activity will appear here as data is refreshed and predictions are generated.
              </p>
            </div>
          ) : (
            Object.entries(groupedEvents).map(([date, events]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
                <div className="space-y-2">
                  {events.map((event) => {
                    const StatusIcon = STATUS_ICONS[event.status]
                    const CategoryIcon = CATEGORY_ICONS[event.category] || Activity
                    const statusColor = STATUS_COLORS[event.status]

                    return (
                      <div
                        key={event.id}
                        className="bg-card border rounded-lg p-4 flex items-start gap-3"
                      >
                        <div className={cn('p-2 rounded-lg', statusColor)}>
                          <StatusIcon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {CATEGORY_LABELS[event.category] || event.category}
                            </span>
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded',
                                event.type === 'refresh' && 'bg-blue-500/10 text-blue-500',
                                event.type === 'prediction' && 'bg-purple-500/10 text-purple-500',
                                event.type === 'analysis' && 'bg-amber-500/10 text-amber-500'
                              )}
                            >
                              {event.type}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{event.message}</p>

                          {event.details && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {event.details.inserted !== undefined && (
                                <span className="text-green-500">
                                  +{event.details.inserted} inserted
                                </span>
                              )}
                              {event.details.updated !== undefined && (
                                <span className="text-blue-500">
                                  ~{event.details.updated} updated
                                </span>
                              )}
                              {event.details.errors !== undefined && event.details.errors > 0 && (
                                <span className="text-red-500">
                                  {event.details.errors} errors
                                </span>
                              )}
                              {event.details.duration !== undefined && (
                                <span>{(event.details.duration / 1000).toFixed(1)}s</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
