'use client'

import { useUpdates } from './update-provider'
import { DataCategory } from '@/types'
import { cn } from '@/lib/utils'
import { Clock, Loader2 } from 'lucide-react'

interface DataFreshnessBadgeProps {
  category: DataCategory
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

function formatRelativeTime(dateString: string | undefined): string {
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

function getFreshnessColor(dateString: string | undefined): string {
  if (!dateString) return 'text-muted-foreground bg-muted'

  const date = new Date(dateString)
  const now = new Date()
  const diffHours = (now.getTime() - date.getTime()) / 3600000

  if (diffHours < 1) return 'text-green-600 bg-green-500/10'
  if (diffHours < 4) return 'text-amber-600 bg-amber-500/10'
  if (diffHours < 24) return 'text-orange-600 bg-orange-500/10'
  return 'text-red-600 bg-red-500/10'
}

export function DataFreshnessBadge({
  category,
  className,
  showLabel = true,
  size = 'sm',
}: DataFreshnessBadgeProps) {
  const { lastRefreshTimes, isRefreshing } = useUpdates()
  const lastRefresh = lastRefreshTimes[category]
  const isLoading = isRefreshing[category]

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
  }

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium",
        sizeClasses[size],
        getFreshnessColor(lastRefresh),
        className
      )}
      title={lastRefresh ? `Last updated: ${new Date(lastRefresh).toLocaleString()}` : 'Never updated'}
    >
      {isLoading ? (
        <Loader2 className={cn(iconSizes[size], "animate-spin")} />
      ) : (
        <Clock className={iconSizes[size]} />
      )}
      {showLabel && (
        <span>{formatRelativeTime(lastRefresh)}</span>
      )}
    </span>
  )
}
