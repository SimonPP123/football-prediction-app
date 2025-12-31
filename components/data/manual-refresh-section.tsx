'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Search,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DataCategory = 'master' | 'live' | 'post-match' | 'historical' | 'external' | 'ai'

interface DataSource {
  id: string
  name: string
  tableName: string
  targetTables: string[]
  endpoint: string | null
  refreshEndpoint: string | null
  icon: any
  description: string
  dataCategory: DataCategory
  refreshSchedule: string
  refreshExample: string
  estimatedTime?: string
  rateLimit?: string
  dependencies?: string[]
}

interface TableStats {
  count: number
  lastUpdated?: string | null
}

interface ManualRefreshSectionProps {
  dataSources: DataSource[]
  stats: Record<string, TableStats> | null
  refreshing: Record<string, boolean>
  refreshStatus: Record<string, 'idle' | 'success' | 'error'>
  onRefresh: (source: DataSource) => void | Promise<void>
  onOddsSelect?: () => void
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  master: { bg: 'bg-slate-100', text: 'text-slate-600' },
  live: { bg: 'bg-red-100', text: 'text-red-600' },
  'post-match': { bg: 'bg-orange-100', text: 'text-orange-600' },
  historical: { bg: 'bg-blue-100', text: 'text-blue-600' },
  external: { bg: 'bg-purple-100', text: 'text-purple-600' },
  ai: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
}

function formatRelativeTime(dateString: string | null | undefined): string {
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

export function ManualRefreshSection({
  dataSources,
  stats,
  refreshing,
  refreshStatus,
  onRefresh,
  onOddsSelect,
}: ManualRefreshSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter sources by search query
  const filteredSources = dataSources.filter((source) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      source.name.toLowerCase().includes(query) ||
      source.tableName.toLowerCase().includes(query) ||
      source.description.toLowerCase().includes(query)
    )
  })

  // Group sources that can be refreshed
  const refreshableSources = filteredSources.filter((s) => s.refreshEndpoint)

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
          <div className="text-left">
            <h3 className="font-semibold">Manual Refresh</h3>
            <p className="text-xs text-muted-foreground">
              {refreshableSources.length} individual endpoints available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Advanced</span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search data sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Grid of refresh buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {refreshableSources.map((source) => {
              const Icon = source.icon
              const tableStats = stats?.[source.tableName]
              const isRefreshing = refreshing[source.id]
              const status = refreshStatus[source.id] || 'idle'
              const catColor = categoryColors[source.dataCategory] || categoryColors.master

              // Check dependencies
              const missingDeps =
                source.dependencies?.filter((dep) => {
                  const depStats = stats?.[dep]
                  return !depStats || depStats.count === 0
                }) || []

              const isDisabled = missingDeps.length > 0 || isRefreshing

              // Special handling for odds - show select button
              if (source.id === 'odds' && onOddsSelect) {
                return (
                  <div key={source.id} className="flex gap-1">
                    <button
                      onClick={() => onRefresh(source)}
                      disabled={isDisabled}
                      className={cn(
                        'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                        status === 'success' && 'bg-green-50 border-green-200 text-green-700',
                        status === 'error' && 'bg-red-50 border-red-200 text-red-700',
                        status === 'idle' && !isDisabled && 'bg-muted/50 border-border hover:border-primary/50',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isRefreshing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : status === 'success' ? (
                        <Check className="w-4 h-4" />
                      ) : status === 'error' ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span className="truncate">{source.name}</span>
                    </button>
                    <button
                      onClick={onOddsSelect}
                      disabled={isDisabled}
                      className={cn(
                        'px-2 py-2 rounded-lg border text-sm transition-all',
                        !isDisabled && 'bg-purple-50 border-purple-200 hover:border-purple-300',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                      title="Select matches"
                    >
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </button>
                  </div>
                )
              }

              return (
                <button
                  key={source.id}
                  onClick={() => onRefresh(source)}
                  disabled={isDisabled}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                    status === 'success' && 'bg-green-50 border-green-200 text-green-700',
                    status === 'error' && 'bg-red-50 border-red-200 text-red-700',
                    status === 'idle' && !isDisabled && 'bg-muted/50 border-border hover:border-primary/50',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  title={
                    missingDeps.length > 0
                      ? `Missing: ${missingDeps.join(', ')}`
                      : `${source.description} (${formatRelativeTime(tableStats?.lastUpdated)})`
                  }
                >
                  {isRefreshing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : status === 'success' ? (
                    <Check className="w-4 h-4" />
                  ) : status === 'error' ? (
                    <X className="w-4 h-4" />
                  ) : missingDeps.length > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="truncate">{source.name}</span>
                  {tableStats && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {tableStats.count.toLocaleString()}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {filteredSources.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No data sources match "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
