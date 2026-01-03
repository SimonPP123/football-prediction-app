'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUpdates } from '@/components/updates/update-provider'

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
// Note: API returns camelCase (already transformed), but handle both cases for safety
function transformLeague(data: any): LeagueConfig {
  return {
    id: data.id,
    apiId: data.apiId ?? data.api_id,
    name: data.name,
    country: data.country,
    logo: data.logo,
    currentSeason: data.currentSeason ?? data.current_season,
    oddsSportKey: data.oddsSportKey ?? data.odds_sport_key,
    isActive: data.isActive ?? data.is_active ?? false,
    displayOrder: data.displayOrder ?? data.display_order ?? 999,
  }
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [currentLeague, setCurrentLeagueState] = useState<LeagueConfig | null>(null)
  const [leagues, setLeagues] = useState<LeagueConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addRefreshEvent } = useUpdates()
  const router = useRouter()
  // Track if this is the initial load to avoid logging on page refresh
  const isInitialLoad = useRef(true)

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

      let selectedLeague: LeagueConfig | null = null

      if (savedLeagueId && fetchedLeagues.length > 0) {
        const savedLeague = fetchedLeagues.find((l: LeagueConfig) => l.id === savedLeagueId)
        if (savedLeague) {
          selectedLeague = savedLeague
        } else {
          // Saved league not found or not active, use first active league
          selectedLeague = fetchedLeagues[0]
        }
      } else if (fetchedLeagues.length > 0) {
        // No saved league, use first active league
        selectedLeague = fetchedLeagues[0]
      }

      if (selectedLeague) {
        setCurrentLeagueState(selectedLeague)
        // Set cookie for server-side access
        document.cookie = `${STORAGE_KEY}=${selectedLeague.id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
      }

      setIsLoading(false)
      // Mark initial load as complete so subsequent changes will be logged
      isInitialLoad.current = false
    }

    init()
  }, [fetchLeagues])

  // Set current league and save to localStorage + cookie
  const setCurrentLeague = useCallback((league: LeagueConfig) => {
    const previousLeague = currentLeague
    setCurrentLeagueState(league)
    localStorage.setItem(STORAGE_KEY, league.id)

    // Set cookie for server-side access (expires in 1 year)
    document.cookie = `${STORAGE_KEY}=${league.id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

    // Update URL with league_id for shareable links
    const url = new URL(window.location.href)
    url.searchParams.set('league_id', league.id)
    window.history.replaceState({}, '', url.toString())

    // Log league switch event (only for user-initiated switches, not initial load)
    if (!isInitialLoad.current && previousLeague?.id !== league.id) {
      addRefreshEvent({
        category: 'leagues',
        type: 'refresh',
        status: 'info',
        message: previousLeague
          ? `Switched from ${previousLeague.name} to ${league.name}`
          : `Selected ${league.name}`,
        details: {
          league: league.name,
          rawResponse: {
            previousLeague: previousLeague ? { id: previousLeague.id, name: previousLeague.name, apiId: previousLeague.apiId } : null,
            newLeague: { id: league.id, name: league.name, apiId: league.apiId, season: league.currentSeason }
          }
        }
      })

      // Refresh server components to fetch data for the new league
      // This ensures server-rendered content (stats, standings, upcoming matches) updates
      router.refresh()
    }
  }, [currentLeague, addRefreshEvent, router])

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
