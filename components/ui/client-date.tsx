'use client'

import { useState, useEffect } from 'react'

interface ClientDateProps {
  date: string | Date
  format?: 'short' | 'long' | 'relative' | 'datetime'
  className?: string
  fallback?: string
}

/**
 * Client-side date display component that avoids hydration mismatches.
 * Renders a static placeholder on server, then updates with actual date on client.
 */
export function ClientDate({ date, format = 'short', className, fallback = '...' }: ClientDateProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span className={className}>{fallback}</span>
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date

  let formatted: string
  switch (format) {
    case 'long':
      formatted = dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      break
    case 'datetime':
      formatted = dateObj.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
      break
    case 'relative':
      formatted = getRelativeTime(dateObj)
      break
    case 'short':
    default:
      formatted = dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })
  }

  return <span className={className}>{formatted}</span>
}

function getRelativeTime(date: Date): string {
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
