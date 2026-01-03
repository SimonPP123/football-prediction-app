'use client'

import { cn } from '@/lib/utils'
import {
  Calendar,
  Target,
  Radio,
  ClipboardCheck,
  BarChart3,
  AlertCircle
} from 'lucide-react'

const TRIGGER_ICONS = {
  'pre-match': Calendar,
  'prediction': Target,
  'live': Radio,
  'post-match': ClipboardCheck,
  'analysis': BarChart3
}

const TRIGGER_LABELS = {
  'pre-match': 'Pre-Match',
  'prediction': 'Prediction',
  'live': 'Live',
  'post-match': 'Post-Match',
  'analysis': 'Analysis'
}

const TRIGGER_DESCRIPTIONS = {
  'pre-match': 'Refreshes lineups, injuries, and odds 50-60 min before kickoff',
  'prediction': 'Generates AI predictions 10-50 min before kickoff',
  'live': 'Refreshes live match data during matches (1H, HT, 2H)',
  'post-match': 'Syncs final scores and stats 90-150 min after full-time',
  'analysis': 'Generates post-match analysis 150-210 min after full-time'
}

interface TriggerStatusCardProps {
  type: 'pre-match' | 'prediction' | 'live' | 'post-match' | 'analysis'
  data: {
    lastTriggered?: string | null
    successToday: number
    errorToday: number
    enabled: boolean
  }
}

function formatRelativeTime(time: string | null | undefined): string {
  if (!time) return 'No triggers today'
  const ms = Date.now() - new Date(time).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function TriggerStatusCard({ type, data }: TriggerStatusCardProps) {
  const Icon = TRIGGER_ICONS[type]
  const label = TRIGGER_LABELS[type]
  const description = TRIGGER_DESCRIPTIONS[type]
  const total = data.successToday + data.errorToday
  const hasErrors = data.errorToday > 0

  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-3 transition-opacity group relative',
        !data.enabled && 'opacity-50'
      )}
      title={description}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
        {!data.enabled && (
          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground ml-auto">
            Disabled
          </span>
        )}
      </div>
      {/* Description tooltip on hover */}
      <div className="text-[10px] text-muted-foreground mb-2 line-clamp-2 opacity-70">
        {description}
      </div>

      <div className="flex items-baseline gap-1">
        <span className={cn(
          'text-2xl font-bold',
          hasErrors ? 'text-amber-500' : total > 0 ? 'text-green-500' : 'text-muted-foreground'
        )}>
          {data.successToday}
        </span>
        <span className="text-sm text-muted-foreground">
          / {total}
        </span>
      </div>

      <div className="text-xs text-muted-foreground mt-1">
        {formatRelativeTime(data.lastTriggered)}
      </div>

      {hasErrors && (
        <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" />
          <span>{data.errorToday} error{data.errorToday > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}
