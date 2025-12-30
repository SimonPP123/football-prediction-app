'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useUpdates } from './update-provider'
import { DataCategory } from '@/types'

const POLLER_SETTINGS_KEY = 'football-ai-poller-settings'

interface PollerSettings {
  enabled: boolean
  intervals: Record<string, number> // minutes
}

const DEFAULT_SETTINGS: PollerSettings = {
  enabled: false,
  intervals: {
    // Less frequent defaults to avoid API rate limits
    fixtures: 120,      // 2 hours (recommended)
    lineups: 60,        // 1 hour (recommended)
    standings: 360,     // 6 hours (recommended)
    injuries: 720,      // 12 hours (recommended)
    odds: 120,          // 2 hours (recommended)
    'team-stats': 1440, // 24 hours (recommended)
    'top-performers': 1440, // 24 hours (recommended)
  },
}

// Data categories that can be polled (removed weather, predictions, match-analysis)
const POLLABLE_CATEGORIES: DataCategory[] = [
  'fixtures',
  'standings',
  'injuries',
  'odds',
  'lineups',
  'team-stats',
  'top-performers',
]

// Endpoint-specific interval options with recommended defaults
interface IntervalOption {
  label: string
  value: number
  recommended?: boolean
}

const CATEGORY_INTERVALS: Record<string, IntervalOption[]> = {
  fixtures: [
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120, recommended: true },
    { label: '4 hours', value: 240 },
    { label: '6 hours', value: 360 },
  ],
  standings: [
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '6 hours', value: 360, recommended: true },
    { label: '12 hours', value: 720 },
  ],
  injuries: [
    { label: '4 hours', value: 240 },
    { label: '6 hours', value: 360 },
    { label: '12 hours', value: 720, recommended: true },
    { label: '24 hours', value: 1440 },
  ],
  odds: [
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120, recommended: true },
    { label: '4 hours', value: 240 },
    { label: '6 hours', value: 360 },
  ],
  lineups: [
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60, recommended: true },
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
  ],
  'team-stats': [
    { label: '6 hours', value: 360 },
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440, recommended: true },
    { label: '48 hours', value: 2880 },
  ],
  'top-performers': [
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440, recommended: true },
    { label: '48 hours', value: 2880 },
    { label: '72 hours', value: 4320 },
  ],
}

export function usePollerSettings() {
  const [settings, setSettings] = useState<PollerSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(POLLER_SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch (error) {
      console.error('Failed to load poller settings:', error)
    }
    setIsLoaded(true)
  }, [])

  const updateSettings = useCallback((updates: Partial<PollerSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates }
      try {
        localStorage.setItem(POLLER_SETTINGS_KEY, JSON.stringify(newSettings))
      } catch (error) {
        console.error('Failed to save poller settings:', error)
      }
      return newSettings
    })
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    updateSettings({ enabled })
  }, [updateSettings])

  const setInterval = useCallback((category: string, minutes: number) => {
    updateSettings({
      intervals: { ...settings.intervals, [category]: minutes }
    })
  }, [settings.intervals, updateSettings])

  return { settings, isLoaded, setEnabled, setInterval, updateSettings }
}

export function UpdatePoller() {
  const { refreshCategory, lastRefreshTimes, isRefreshing, addRefreshEvent } = useUpdates()
  const { settings, isLoaded } = usePollerSettings()
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Check if we should poll a category based on last refresh time
  const shouldPoll = useCallback((category: DataCategory) => {
    const lastRefresh = lastRefreshTimes[category]
    if (!lastRefresh) return true // Never refreshed

    const intervalMinutes = settings.intervals[category] || 15
    const lastRefreshTime = new Date(lastRefresh).getTime()
    const now = Date.now()
    const elapsed = (now - lastRefreshTime) / 1000 / 60 // minutes

    return elapsed >= intervalMinutes
  }, [lastRefreshTimes, settings.intervals])

  // Poll a specific category
  const pollCategory = useCallback(async (category: DataCategory) => {
    // Don't poll if already refreshing
    if (isRefreshing[category]) return

    // Check if enough time has passed
    if (!shouldPoll(category)) return

    // Add info event about automatic refresh
    addRefreshEvent({
      category,
      type: 'refresh',
      status: 'info',
      message: `Auto-refreshing ${category}...`,
    })

    await refreshCategory(category)
  }, [isRefreshing, shouldPoll, addRefreshEvent, refreshCategory])

  // Set up polling intervals
  useEffect(() => {
    if (!isLoaded || !settings.enabled) {
      // Clear all intervals if disabled
      Object.values(intervalsRef.current).forEach(clearInterval)
      intervalsRef.current = {}
      return
    }

    // Set up interval for each category
    POLLABLE_CATEGORIES.forEach(category => {
      const intervalMinutes = settings.intervals[category] || 15
      const intervalMs = intervalMinutes * 60 * 1000

      // Clear existing interval
      if (intervalsRef.current[category]) {
        clearInterval(intervalsRef.current[category])
      }

      // Set up new interval
      intervalsRef.current[category] = setInterval(() => {
        pollCategory(category)
      }, intervalMs)
    })

    // Cleanup
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval)
      intervalsRef.current = {}
    }
  }, [isLoaded, settings.enabled, settings.intervals, pollCategory])

  // Initial check when poller is enabled
  useEffect(() => {
    if (!isLoaded || !settings.enabled) return

    // Check all categories on mount (with delay to avoid overwhelming)
    const checkAll = async () => {
      for (const category of POLLABLE_CATEGORIES) {
        if (shouldPoll(category)) {
          await pollCategory(category)
          // Small delay between polls
          await new Promise(r => setTimeout(r, 2000))
        }
      }
    }

    // Delay initial check by 5 seconds
    const timer = setTimeout(checkAll, 5000)
    return () => clearTimeout(timer)
  }, [isLoaded, settings.enabled])

  return null // This is a headless component
}

// Settings component for the poller
interface PollerSettingsProps {
  className?: string
}

export function PollerSettingsPanel({ className }: PollerSettingsProps) {
  const { settings, isLoaded, setEnabled, setInterval } = usePollerSettings()

  if (!isLoaded) return null

  const categoryLabels: Record<string, string> = {
    fixtures: 'Fixtures',
    standings: 'Standings',
    injuries: 'Injuries',
    odds: 'Odds',
    lineups: 'Lineups',
    'team-stats': 'Team Stats',
    'top-performers': 'Top Performers',
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium">Auto-Refresh</h4>
          <p className="text-sm text-muted-foreground">
            Automatically refresh data in the background
          </p>
        </div>
        <button
          onClick={() => setEnabled(!settings.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-3 pt-3 border-t border-border">
          {POLLABLE_CATEGORIES.map(category => {
            const options = CATEGORY_INTERVALS[category] || []
            const currentValue = settings.intervals[category] || DEFAULT_SETTINGS.intervals[category]

            return (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm">{categoryLabels[category] || category}</span>
                <select
                  value={currentValue}
                  onChange={e => setInterval(category, parseInt(e.target.value))}
                  className="text-sm bg-muted border border-border rounded px-2 py-1"
                >
                  {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}{opt.recommended ? ' (Recommended)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
