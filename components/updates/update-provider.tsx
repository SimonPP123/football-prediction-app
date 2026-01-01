'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { DataCategory, RefreshEvent, UpdateContextValue, UpdateState } from '@/types'

const STORAGE_KEY = 'football-ai-update-state'
const MAX_HISTORY_ITEMS = 100

const defaultState: UpdateState = {
  lastRefreshTimes: {},
  isRefreshing: {},
  refreshHistory: [],
}

const UpdateContext = createContext<UpdateContextValue | null>(null)

export function useUpdates() {
  const context = useContext(UpdateContext)
  if (!context) {
    throw new Error('useUpdates must be used within an UpdateProvider')
  }
  return context
}

interface UpdateProviderProps {
  children: ReactNode
}

export function UpdateProvider({ children }: UpdateProviderProps) {
  const [state, setState] = useState<UpdateState>(defaultState)
  const abortControllersRef = useRef<Record<string, AbortController>>({})

  // Load state from localStorage and server on mount
  useEffect(() => {
    // First load from localStorage for instant display
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as UpdateState
        setState(parsed)
      }
    } catch (error) {
      console.error('Failed to load update state from localStorage:', error)
    }

    // Then fetch server-side history to merge with localStorage
    fetch('/api/updates/history?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.history && data.history.length > 0) {
          setState(prev => {
            // Create a Set of existing IDs to avoid duplicates
            const existingIds = new Set(prev.refreshHistory.map(e => e.id))
            // Add server history items that don't exist locally
            const newItems = data.history.filter(
              (e: RefreshEvent) => !existingIds.has(e.id)
            )
            if (newItems.length === 0) return prev
            // Merge and sort by timestamp, keep only MAX_HISTORY_ITEMS
            const merged = [...prev.refreshHistory, ...newItems]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, MAX_HISTORY_ITEMS)
            return { ...prev, refreshHistory: merged }
          })
        }
      })
      .catch(err => console.error('Failed to load server history:', err))
  }, [])

  // Persist state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save update state to localStorage:', error)
    }
  }, [state])

  const updateLastRefreshTime = useCallback((category: DataCategory, time: string) => {
    setState(prev => ({
      ...prev,
      lastRefreshTimes: {
        ...prev.lastRefreshTimes,
        [category]: time,
      },
    }))
  }, [])

  const setRefreshing = useCallback((category: DataCategory, isRefreshing: boolean) => {
    setState(prev => ({
      ...prev,
      isRefreshing: {
        ...prev.isRefreshing,
        [category]: isRefreshing,
      },
    }))
  }, [])

  const addRefreshEvent = useCallback((event: Omit<RefreshEvent, 'id' | 'timestamp'>) => {
    const newEvent: RefreshEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    }

    setState(prev => ({
      ...prev,
      refreshHistory: [newEvent, ...prev.refreshHistory].slice(0, MAX_HISTORY_ITEMS),
      lastRefreshTimes: event.status === 'success'
        ? { ...prev.lastRefreshTimes, [event.category]: newEvent.timestamp }
        : prev.lastRefreshTimes,
    }))

    // Log to server (fire and forget - don't block UI)
    fetch('/api/updates/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: event.category,
        type: event.type,
        status: event.status,
        message: event.message,
        details: event.details,
      }),
    }).catch(err => console.error('Failed to log event to server:', err))
  }, [])

  const refreshCategory = useCallback(async (category: DataCategory, leagueId?: string, leagueName?: string) => {
    // Create abort controller for this request
    const abortController = new AbortController()
    abortControllersRef.current[category] = abortController

    setRefreshing(category, true)

    // Format category name for display (e.g., "team-stats" -> "Team Stats")
    const categoryDisplay = category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    try {
      const params = new URLSearchParams()
      if (leagueId) params.set('league_id', leagueId)
      const queryString = params.toString()
      const endpoint = `/api/data/refresh/${category}${queryString ? '?' + queryString : ''}`
      const response = await fetch(endpoint, { method: 'POST', signal: abortController.signal })
      const data = await response.json()

      // Use league name from response if available, otherwise use passed parameter
      const displayLeague = data.league || leagueName

      if (data.success) {
        addRefreshEvent({
          category,
          type: 'refresh',
          status: 'success',
          message: displayLeague
            ? `${categoryDisplay} refreshed for ${displayLeague}`
            : `${categoryDisplay} refreshed successfully`,
          details: {
            inserted: data.inserted,
            updated: data.updated,
            errors: data.errors,
            duration: data.duration,
            league: displayLeague,
            rawResponse: data,
          },
        })
      } else {
        addRefreshEvent({
          category,
          type: 'refresh',
          status: 'error',
          message: data.error || `Failed to refresh ${categoryDisplay}`,
          details: {
            league: displayLeague,
            rawResponse: data,
          },
        })
      }
    } catch (error) {
      // Don't log abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        addRefreshEvent({
          category,
          type: 'refresh',
          status: 'error',
          message: `${categoryDisplay} refresh cancelled`,
          details: { league: leagueName },
        })
      } else {
        addRefreshEvent({
          category,
          type: 'refresh',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: {
            league: leagueName,
            rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
          },
        })
      }
    } finally {
      delete abortControllersRef.current[category]
      setRefreshing(category, false)
    }
  }, [setRefreshing, addRefreshEvent])

  const stopAllRefreshes = useCallback(() => {
    // Abort all ongoing requests
    Object.entries(abortControllersRef.current).forEach(([category, controller]) => {
      controller.abort()
    })
    // Clear all abort controllers
    abortControllersRef.current = {}
    // Reset all isRefreshing states
    setState(prev => ({
      ...prev,
      isRefreshing: {},
    }))
  }, [])

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      refreshHistory: [],
    }))
  }, [])

  const value: UpdateContextValue = {
    ...state,
    refreshCategory,
    addRefreshEvent,
    updateLastRefreshTime,
    setRefreshing,
    clearHistory,
    stopAllRefreshes,
  }

  return (
    <UpdateContext.Provider value={value}>
      {children}
    </UpdateContext.Provider>
  )
}
