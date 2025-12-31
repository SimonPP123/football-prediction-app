'use client'

import { Database, BarChart3, Calendar, Activity, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataStatus } from '@/hooks/use-data-status'

interface DataStatusPanelProps {
  status: DataStatus | null
  summary: {
    totalTables: number
    totalRecords: number
    lastSync: string | null
  } | null
  loading?: boolean
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

export function DataStatusPanel({ status, summary, loading }: DataStatusPanelProps) {
  const fixtures = status?.fixtures

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* Database stats */}
        <div className="flex items-center gap-2 text-sm">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Tables:</span>
          <span className="font-bold">{summary?.totalTables || 24}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Records:</span>
          <span className="font-bold">{summary?.totalRecords?.toLocaleString() || '-'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Last Sync:</span>
          <span className="font-bold">{formatRelativeTime(summary?.lastSync)}</span>
        </div>

        {/* Separator */}
        <div className="hidden md:block w-px h-4 bg-border" />

        {/* Fixture status */}
        {fixtures && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Activity className={cn('w-4 h-4', fixtures.live > 0 ? 'text-red-500' : 'text-muted-foreground')} />
              <span className="text-muted-foreground">Live:</span>
              <span className={cn('font-bold', fixtures.live > 0 && 'text-red-600')}>{fixtures.live}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Upcoming:</span>
              <span className="font-bold">{fixtures.upcoming}</span>
            </div>

            {(fixtures.missingStats > 0 || fixtures.missingEvents > 0) && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-muted-foreground">Missing:</span>
                <span className="font-bold text-amber-600">
                  {fixtures.missingStats > 0 && `${fixtures.missingStats} stats`}
                  {fixtures.missingStats > 0 && fixtures.missingEvents > 0 && ', '}
                  {fixtures.missingEvents > 0 && `${fixtures.missingEvents} events`}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
