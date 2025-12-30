'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

export interface LeagueConfig {
  id: string
  apiId: number
  name: string
  country: string
  logo: string
  currentSeason: number
  oddsSportKey: string | null
  isActive: boolean
  displayOrder: number
}

interface LeagueContextType {
  currentLeague: LeagueConfig | null
  leagues: LeagueConfig[]
  isLoading: boolean
  error: string | null
  setCurrentLeague: (league: LeagueConfig) => void
  refreshLeagues: () => Promise<void>
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined)

const STORAGE_KEY = 'football-prediction-league'

// Transform API response to LeagueConfig
function transformLeague(data: any): LeagueConfig {
  return {
    id: data.id,
    apiId: data.api_id,
    name: data.name,
    country: data.country,
    logo: data.logo,
    currentSeason: data.current_season,
    oddsSportKey: data.odds_sport_key,
    isActive: data.is_active ?? false,
    displayOrder: data.display_order ?? 999,
  }
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [currentLeague, setCurrentLeagueState] = useState<LeagueConfig | null>(null)
  const [leagues, setLeagues] = useState<LeagueConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch active leagues from API
  const fetchLeagues = useCallback(async () => {
    try {
      const response = await fetch('/api/leagues?active=true')
      if (!response.ok) {
        throw new Error('Failed to fetch leagues')
      }
      const data = await response.json()
      const transformedLeagues = data.map(transformLeague).sort(
        (a: LeagueConfig, b: LeagueConfig) => a.displayOrder - b.displayOrder
      )
      setLeagues(transformedLeagues)
      return transformedLeagues
    } catch (err) {
      console.error('Error fetching leagues:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leagues')
      return []
    }
  }, [])

  // Initialize: load saved league from localStorage and fetch leagues
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)

      // Fetch all active leagues
      const fetchedLeagues = await fetchLeagues()

      // Try to load saved league from localStorage
      const savedLeagueId = localStorage.getItem(STORAGE_KEY)

      if (savedLeagueId && fetchedLeagues.length > 0) {
        const savedLeague = fetchedLeagues.find((l: LeagueConfig) => l.id === savedLeagueId)
        if (savedLeague) {
          setCurrentLeagueState(savedLeague)
        } else {
          // Saved league not found or not active, use first active league
          setCurrentLeagueState(fetchedLeagues[0])
        }
      } else if (fetchedLeagues.length > 0) {
        // No saved league, use first active league
        setCurrentLeagueState(fetchedLeagues[0])
      }

      setIsLoading(false)
    }

    init()
  }, [fetchLeagues])

  // Set current league and save to localStorage
  const setCurrentLeague = useCallback((league: LeagueConfig) => {
    setCurrentLeagueState(league)
    localStorage.setItem(STORAGE_KEY, league.id)

    // Update URL with league_id for shareable links
    const url = new URL(window.location.href)
    url.searchParams.set('league_id', league.id)
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Refresh leagues from API
  const refreshLeagues = useCallback(async () => {
    setIsLoading(true)
    await fetchLeagues()
    setIsLoading(false)
  }, [fetchLeagues])

  // Check URL for league_id on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const leagueIdFromUrl = url.searchParams.get('league_id')

    if (leagueIdFromUrl && leagues.length > 0) {
      const leagueFromUrl = leagues.find(l => l.id === leagueIdFromUrl)
      if (leagueFromUrl && leagueFromUrl.id !== currentLeague?.id) {
        setCurrentLeague(leagueFromUrl)
      }
    }
  }, [leagues, currentLeague, setCurrentLeague])

  return (
    <LeagueContext.Provider
      value={{
        currentLeague,
        leagues,
        isLoading,
        error,
        setCurrentLeague,
        refreshLeagues,
      }}
    >
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague() {
  const context = useContext(LeagueContext)
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider')
  }
  return context
}

// Helper to get season display string (e.g., "2025-2026")
export function getSeasonDisplay(season: number | null | undefined): string {
  if (season == null) return ''
  return `${season}-${season + 1}`
}

// Helper to get full league title (e.g., "Premier League 2025-2026")
export function getLeagueTitle(league: LeagueConfig | null): string {
  if (!league) return 'Loading...'
  const seasonStr = getSeasonDisplay(league.currentSeason)
  return seasonStr ? `${league.name} ${seasonStr}` : league.name
}
