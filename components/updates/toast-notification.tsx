'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useUpdates } from './update-provider'
import { RefreshEvent } from '@/types'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

interface Toast {
  id: string
  event: RefreshEvent
  visible: boolean
}

const TOAST_DURATION = 5000 // 5 seconds
const DISMISSED_IDS_KEY = 'football-ai-dismissed-toasts'

// Helper to load dismissed IDs from sessionStorage
function loadDismissedIds(): Set<string> {
  try {
    const stored = sessionStorage.getItem(DISMISSED_IDS_KEY)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch (e) {
    // Ignore errors
  }
  return new Set()
}

// Helper to save dismissed IDs to sessionStorage
function saveDismissedIds(ids: Set<string>) {
  try {
    // Keep only last 50 IDs to prevent storage bloat
    const entries = Array.from(ids)
    const trimmed = entries.slice(-50)
    sessionStorage.setItem(DISMISSED_IDS_KEY, JSON.stringify(trimmed))
  } catch (e) {
    // Ignore errors
  }
}

export function ToastNotificationContainer() {
  const { refreshHistory } = useUpdates()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [lastProcessedId, setLastProcessedId] = useState<string | null>(null)
  // Track dismissed toast IDs to prevent them from reappearing (persisted to sessionStorage)
  const dismissedIdsRef = useRef<Set<string>>(new Set())
  const [isInitialized, setIsInitialized] = useState(false)

  // Load dismissed IDs from sessionStorage on mount
  useEffect(() => {
    dismissedIdsRef.current = loadDismissedIds()
    setIsInitialized(true)
  }, [])

  // Watch for new events in refresh history
  useEffect(() => {
    if (!isInitialized) return
    if (refreshHistory.length === 0) return

    const latestEvent = refreshHistory[0]
    if (latestEvent.id === lastProcessedId) return

    // Skip if this toast was already dismissed by user
    if (dismissedIdsRef.current.has(latestEvent.id)) return

    // Add new toast
    setToasts(prev => [
      { id: latestEvent.id, event: latestEvent, visible: true },
      ...prev,
    ].slice(0, 5)) // Keep max 5 toasts

    setLastProcessedId(latestEvent.id)

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      dismissToast(latestEvent.id)
    }, TOAST_DURATION)

    return () => clearTimeout(timer)
  }, [refreshHistory, lastProcessedId, isInitialized])

  const dismissToast = useCallback((id: string) => {
    // Track this ID as dismissed so it won't reappear
    dismissedIdsRef.current.add(id)

    // Persist to sessionStorage
    saveDismissedIds(dismissedIdsRef.current)

    setToasts(prev =>
      prev.map(t => t.id === id ? { ...t, visible: false } : t)
    )

    // Remove from DOM after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          event={toast.event}
          visible={toast.visible}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  event: RefreshEvent
  visible: boolean
  onDismiss: () => void
}

function ToastItem({ event, visible, onDismiss }: ToastItemProps) {
  const statusConfig = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-500/10 border-green-500/20',
      iconColor: 'text-green-500',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-500/10 border-red-500/20',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-500/10 border-amber-500/20',
      iconColor: 'text-amber-500',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500/10 border-blue-500/20',
      iconColor: 'text-blue-500',
    },
  }

  const config = statusConfig[event.status]
  const Icon = config.icon

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300",
        config.bg,
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      )}
    >
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.iconColor)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium capitalize">{event.category}</span>
          <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
        </div>
        <p className="text-sm text-foreground mt-0.5">{event.message}</p>
        {event.details && (
          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1">
            {event.details.league && (
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                {event.details.league}
              </span>
            )}
            <span>
              {event.details.inserted !== undefined && `${event.details.inserted} new`}
              {event.details.updated !== undefined && `, ${event.details.updated} updated`}
              {event.details.duration !== undefined && ` (${(event.details.duration / 1000).toFixed(1)}s)`}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="p-1 hover:bg-muted rounded transition-colors shrink-0"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  )
}
