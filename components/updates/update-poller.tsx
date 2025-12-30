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
    // Critical data (on matchday)
    fixtures: 5,
    lineups: 5,
    // Normal priority
    standings: 15,
    injuries: 15,
    'team-stats': 30,
    // Low priority
    weather: 30,
    odds: 30,
    'top-performers': 60,
  },
}

// Data categories that can be polled
const POLLABLE_CATEGORIES: DataCategory[] = [
  'standings',
  'injuries',
  'odds',
  'weather',
  'fixtures',
  'lineups',
  'team-stats',
  'top-performers',
]

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

  const intervalOptions = [
    { label: '1 min', value: 1 },
    { label: '5 min', value: 5 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
  ]

  const categoryLabels: Record<string, string> = {
    fixtures: 'Fixtures',
    standings: 'Standings',
    injuries: 'Injuries',
    odds: 'Odds',
    weather: 'Weather',
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
          {POLLABLE_CATEGORIES.map(category => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm">{categoryLabels[category] || category}</span>
              <select
                value={settings.intervals[category] || 15}
                onChange={e => setInterval(category, parseInt(e.target.value))}
                className="text-sm bg-muted border border-border rounded px-2 py-1"
              >
                {intervalOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
