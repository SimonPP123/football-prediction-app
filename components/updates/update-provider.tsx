'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
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

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as UpdateState
        setState(parsed)
      }
    } catch (error) {
      console.error('Failed to load update state from localStorage:', error)
    }
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
  }, [])

  const refreshCategory = useCallback(async (category: DataCategory, leagueId?: string, leagueName?: string) => {
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
      const response = await fetch(endpoint, { method: 'POST' })
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
          },
        })
      }
    } catch (error) {
      addRefreshEvent({
        category,
        type: 'refresh',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          league: leagueName,
        },
      })
    } finally {
      setRefreshing(category, false)
    }
  }, [setRefreshing, addRefreshEvent])

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
  }

  return (
    <UpdateContext.Provider value={value}>
      {children}
    </UpdateContext.Provider>
  )
}
