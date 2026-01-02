'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Target,
  Radio,
  ClipboardCheck,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe
} from 'lucide-react'

const TRIGGER_ICONS = {
  'pre-match': Calendar,
  'prediction': Target,
  'live': Radio,
  'post-match': ClipboardCheck,
  'analysis': BarChart3,
  'cron-check': Clock
}

const TRIGGER_LABELS = {
  'pre-match': 'Pre-Match Refresh',
  'prediction': 'AI Prediction',
  'live': 'Live Refresh',
  'post-match': 'Post-Match Refresh',
  'analysis': 'Post-Match Analysis',
  'cron-check': 'Cron Check'
}

const STATUS_ICONS = {
  success: CheckCircle,
  error: XCircle,
  skipped: MinusCircle,
  'no-action': AlertCircle
}

const STATUS_COLORS = {
  success: 'text-green-500 bg-green-500/10',
  error: 'text-red-500 bg-red-500/10',
  skipped: 'text-muted-foreground bg-muted',
  'no-action': 'text-blue-500 bg-blue-500/10'
}

export interface AutomationLog {
  id: string
  trigger_type: string
  cron_run_id: string | null
  league_id: string | null
  league_name: string | null
  fixture_ids: string[]
  fixture_count: number
  webhook_url: string | null
  webhook_status: number | null
  webhook_response: any
  webhook_duration_ms: number | null
  status: 'success' | 'error' | 'skipped' | 'no-action'
  message: string | null
  error_message: string | null
  triggered_at: string
  completed_at: string | null
  details: {
    fixtures?: Array<{
      id: string
      home_team: string
      away_team: string
      match_date?: string
    }>
  } | null
}

interface AutomationLogEntryProps {
  log: AutomationLog
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function AutomationLogEntry({ log }: AutomationLogEntryProps) {
  const [expanded, setExpanded] = useState(false)

  const TriggerIcon = TRIGGER_ICONS[log.trigger_type as keyof typeof TRIGGER_ICONS] || Clock
  const StatusIcon = STATUS_ICONS[log.status]
  const statusColor = STATUS_COLORS[log.status]
  const triggerLabel = TRIGGER_LABELS[log.trigger_type as keyof typeof TRIGGER_LABELS] || log.trigger_type

  const hasDetails = log.webhook_response || log.details?.fixtures?.length || log.error_message

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          'p-4 flex items-start gap-3',
          hasDetails && 'cursor-pointer hover:bg-muted/30 transition-colors'
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* Status icon */}
        <div className={cn('p-2 rounded-lg shrink-0', statusColor)}>
          <StatusIcon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TriggerIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{triggerLabel}</span>

            {log.fixture_count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {log.fixture_count} fixture{log.fixture_count > 1 ? 's' : ''}
              </span>
            )}

            {log.league_name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" />
                {log.league_name}
              </span>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {formatTime(log.triggered_at)}
            </span>
          </div>

          {log.message && (
            <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
          )}

          {/* Webhook status */}
          {log.webhook_status !== null && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className={cn(
                log.webhook_status >= 200 && log.webhook_status < 300
                  ? 'text-green-500'
                  : 'text-red-500'
              )}>
                HTTP {log.webhook_status}
              </span>
              {log.webhook_duration_ms !== null && (
                <span className="text-muted-foreground">
                  {(log.webhook_duration_ms / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        {hasDetails && (
          <div className="shrink-0 p-1">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-4 space-y-3">
          {/* Error message */}
          {log.error_message && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-500">{log.error_message}</p>
            </div>
          )}

          {/* Fixtures triggered */}
          {log.details?.fixtures && log.details.fixtures.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Fixtures Triggered</p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                {log.details.fixtures.map((fixture, idx) => (
                  <div key={fixture.id || idx} className="text-sm">
                    {fixture.home_team} vs {fixture.away_team}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Webhook response */}
          {log.webhook_response && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Webhook Response</p>
              <div className="bg-muted/50 rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(log.webhook_response, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
