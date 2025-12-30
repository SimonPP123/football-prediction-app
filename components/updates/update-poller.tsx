'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useUpdates } from './update-provider'
import { DataCategory } from '@/types'
import { useLeague } from '@/contexts/league-context'

const POLLER_SETTINGS_KEY = 'football-ai-poller-settings'

interface PollerSettings {
  enabled: boolean
  intervals: Record<string, number> // minutes
  units?: Record<string, 'minutes' | 'hours' | 'days'> // user's preferred unit display
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

  const setUnit = useCallback((category: string, unit: 'minutes' | 'hours' | 'days') => {
    updateSettings({
      units: { ...(settings.units || {}), [category]: unit }
    })
  }, [settings.units, updateSettings])

  return { settings, isLoaded, setEnabled, setInterval, setUnit, updateSettings }
}

export function UpdatePoller() {
  const { refreshCategory, lastRefreshTimes, isRefreshing, addRefreshEvent } = useUpdates()
  const { currentLeague } = useLeague()
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

    await refreshCategory(category, currentLeague?.id)
  }, [isRefreshing, shouldPoll, addRefreshEvent, refreshCategory, currentLeague?.id])

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
  }, [isLoaded, settings.enabled, settings.intervals, pollCategory, currentLeague?.id])

  // Initial check when poller is enabled or league changes
  useEffect(() => {
    if (!isLoaded || !settings.enabled || !currentLeague?.id) return

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
  }, [isLoaded, settings.enabled, currentLeague?.id, shouldPoll, pollCategory])

  return null // This is a headless component
}

// Settings component for the poller
interface PollerSettingsProps {
  className?: string
}

// Recommended intervals for each category (in minutes)
const RECOMMENDED_INTERVALS: Record<string, number> = {
  fixtures: 120,
  standings: 360,
  injuries: 720,
  odds: 120,
  lineups: 60,
  'team-stats': 1440,
  'top-performers': 1440,
}

// Format minutes to human-readable string
function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${minutes / 60}h`
  return `${minutes / 1440}d`
}

export function PollerSettingsPanel({ className }: PollerSettingsProps) {
  const { settings, isLoaded, setEnabled, setInterval, setUnit } = usePollerSettings()

  if (!isLoaded) return null

  const categoryConfig: Record<string, { label: string; description: string }> = {
    fixtures: { label: 'Fixtures', description: 'Match schedules & scores' },
    standings: { label: 'Standings', description: 'League table' },
    injuries: { label: 'Injuries', description: 'Player injuries' },
    odds: { label: 'Odds', description: 'Betting odds' },
    lineups: { label: 'Lineups', description: 'Starting XI' },
    'team-stats': { label: 'Team Stats', description: 'Team metrics' },
    'top-performers': { label: 'Top Performers', description: 'Scorers & assists' },
  }

  const handleIntervalChange = (category: string, value: number, unit: 'minutes' | 'hours' | 'days') => {
    let minutes: number
    if (unit === 'days') {
      minutes = value * 1440
    } else if (unit === 'hours') {
      minutes = value * 60
    } else {
      minutes = value
    }
    // Minimum 10 minutes, maximum 7 days
    const clamped = Math.max(10, Math.min(minutes, 10080))
    setInterval(category, clamped)
  }

  const getDisplayValue = (minutes: number, category: string): { value: number; unit: 'minutes' | 'hours' | 'days' } => {
    // Check if user has a stored unit preference
    const storedUnit = settings.units?.[category]
    if (storedUnit) {
      if (storedUnit === 'days') {
        return { value: Math.round(minutes / 1440) || 1, unit: 'days' }
      }
      if (storedUnit === 'hours') {
        return { value: Math.round(minutes / 60) || 1, unit: 'hours' }
      }
      return { value: minutes, unit: 'minutes' }
    }

    // Fall back to auto-detection for initial display
    if (minutes >= 1440 && minutes % 1440 === 0) {
      return { value: minutes / 1440, unit: 'days' }
    }
    if (minutes >= 60 && minutes % 60 === 0) {
      return { value: minutes / 60, unit: 'hours' }
    }
    return { value: minutes, unit: 'minutes' }
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
        <div className="space-y-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Enter custom intervals (min: 10 minutes, max: 7 days)
          </p>
          {POLLABLE_CATEGORIES.map(category => {
            const config = categoryConfig[category]
            const currentMinutes = settings.intervals[category] || DEFAULT_SETTINGS.intervals[category]
            const recommended = RECOMMENDED_INTERVALS[category]
            const { value, unit } = getDisplayValue(currentMinutes, category)

            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{config?.label || category}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (rec: {formatInterval(recommended)})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={unit === 'days' ? 1 : unit === 'hours' ? 1 : 10}
                    max={unit === 'days' ? 7 : unit === 'hours' ? 168 : 10080}
                    value={value}
                    onChange={e => handleIntervalChange(category, parseInt(e.target.value) || 1, unit)}
                    className="w-20 text-sm bg-muted border border-border rounded px-2 py-1 text-center"
                  />
                  <select
                    value={unit}
                    onChange={e => {
                      const newUnit = e.target.value as 'minutes' | 'hours' | 'days'
                      // Save the unit preference
                      setUnit(category, newUnit)
                      // Convert current value to minutes first
                      const currentMinutes = unit === 'days' ? value * 1440 : unit === 'hours' ? value * 60 : value
                      // Then convert to new unit
                      let newValue: number
                      if (newUnit === 'days') {
                        newValue = Math.max(1, Math.round(currentMinutes / 1440))
                      } else if (newUnit === 'hours') {
                        newValue = Math.max(1, Math.round(currentMinutes / 60))
                      } else {
                        newValue = Math.max(10, currentMinutes)
                      }
                      handleIntervalChange(category, newValue, newUnit)
                    }}
                    className="text-sm bg-muted border border-border rounded px-2 py-1"
                  >
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
