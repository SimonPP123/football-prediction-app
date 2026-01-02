'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { AutomationLogEntry, type AutomationLog } from './automation-log-entry'
import {
  Zap,
  RefreshCw,
  AlertCircle,
  Filter
} from 'lucide-react'

type TriggerFilter = 'all' | 'pre-match' | 'prediction' | 'live' | 'post-match' | 'analysis'
type StatusFilter = 'all' | 'success' | 'error' | 'no-action'

const TRIGGER_FILTERS: { value: TriggerFilter; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'pre-match', label: 'Pre-Match' },
  { value: 'prediction', label: 'Prediction' },
  { value: 'live', label: 'Live' },
  { value: 'post-match', label: 'Post-Match' },
  { value: 'analysis', label: 'Analysis' }
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Errors' },
  { value: 'no-action', label: 'No Action' }
]

interface AutomationLogsSectionProps {
  className?: string
}

export function AutomationLogsSection({ className }: AutomationLogsSectionProps) {
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100' })
      if (triggerFilter !== 'all') {
        params.set('trigger_type', triggerFilter)
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const res = await fetch(`/api/automation/logs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data.logs || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [triggerFilter, statusFilter])

  // Group logs by date
  const groupedLogs = logs.reduce((groups, log) => {
    const date = new Date(log.triggered_at).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {} as Record<string, AutomationLog[]>)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <h3 className="text-sm font-medium">Automation Jobs</h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />

          {/* Trigger type filter */}
          <div className="flex gap-1">
            {TRIGGER_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setTriggerFilter(f.value)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  triggerFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-muted-foreground">|</span>

          {/* Status filter */}
          <div className="flex gap-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 p-4 bg-red-500/10 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && logs.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && logs.length === 0 && (
        <div className="bg-card border rounded-lg p-12 text-center">
          <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Automation Jobs</h3>
          <p className="text-sm text-muted-foreground">
            Automation jobs will appear here once the cron runs.
          </p>
        </div>
      )}

      {/* Logs timeline */}
      {Object.keys(groupedLogs).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{date}</h4>
              <div className="space-y-2">
                {dateLogs.map(log => (
                  <AutomationLogEntry key={log.id} log={log} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
