'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TriggerStatusCard } from './trigger-status-card'
import {
  Zap,
  RefreshCw,
  Power,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react'

interface TriggerStats {
  successToday: number
  errorToday: number
  lastTriggered: string | null
  enabled: boolean
}

interface AutomationStatus {
  isEnabled: boolean
  lastCronRun: string | null
  lastCronStatus: string | null
  nextCronRun: string | null
  triggers: {
    preMatch: TriggerStats
    prediction: TriggerStats
    live: TriggerStats
    postMatch: TriggerStats
    analysis: TriggerStats
  }
  errorsToday: number
}

interface AutomationStatusPanelProps {
  className?: string
}

function formatRelativeTime(time: string | null): string {
  if (!time) return 'Never'
  const ms = Date.now() - new Date(time).getTime()
  const future = ms < 0
  const absMs = Math.abs(ms)
  const mins = Math.floor(absMs / 60000)

  if (mins < 1) return future ? 'Any moment' : 'Just now'
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return future ? `in ${days}d` : `${days}d ago`
}

export function AutomationStatusPanel({ className }: AutomationStatusPanelProps) {
  const [status, setStatus] = useState<AutomationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/automation/status')
      if (!res.ok) throw new Error('Failed to fetch status')
      const data = await res.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleManualTrigger = async () => {
    if (triggering) return
    setTriggering(true)
    try {
      const res = await fetch('/api/automation/trigger', { method: 'POST' })
      if (!res.ok) throw new Error('Trigger failed')
      // Refresh status after trigger
      await fetchStatus()
    } catch (err) {
      console.error('Manual trigger failed:', err)
    } finally {
      setTriggering(false)
    }
  }

  if (loading) {
    return (
      <div className={cn('bg-card border rounded-lg p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4" />
          <h3 className="text-sm font-medium">Automation Status</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded"></div>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className={cn('bg-card border rounded-lg p-4', className)}>
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error || 'Failed to load automation status'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-card border rounded-lg p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <h3 className="text-sm font-medium">Automation Status</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
            status.isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
          )}>
            <Power className="w-3 h-3" />
            {status.isEnabled ? 'Active' : 'Disabled'}
          </div>

          {/* Manual trigger button */}
          <button
            onClick={handleManualTrigger}
            disabled={triggering || !status.isEnabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              'bg-primary/10 text-primary hover:bg-primary/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-3 h-3', triggering && 'animate-spin')} />
            {triggering ? 'Running...' : 'Trigger Now'}
          </button>
        </div>
      </div>

      {/* Trigger Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <TriggerStatusCard type="pre-match" data={status.triggers.preMatch} />
        <TriggerStatusCard type="prediction" data={status.triggers.prediction} />
        <TriggerStatusCard type="live" data={status.triggers.live} />
        <TriggerStatusCard type="post-match" data={status.triggers.postMatch} />
        <TriggerStatusCard type="analysis" data={status.triggers.analysis} />
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last cron: {formatRelativeTime(status.lastCronRun)}
          </span>
          <span className="flex items-center gap-1">
            {status.lastCronStatus === 'success' && (
              <CheckCircle className="w-3 h-3 text-green-500" />
            )}
            {status.lastCronStatus === 'error' && (
              <AlertCircle className="w-3 h-3 text-red-500" />
            )}
            {status.lastCronStatus === 'running' && (
              <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
            )}
            Status: {status.lastCronStatus || 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Next check: {formatRelativeTime(status.nextCronRun)}</span>
          <span className={cn(
            status.errorsToday > 0 ? 'text-red-500' : 'text-muted-foreground'
          )}>
            Errors today: {status.errorsToday}
          </span>
        </div>
      </div>
    </div>
  )
}
