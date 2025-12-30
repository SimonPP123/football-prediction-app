/**
 * League Context Utilities
 * Server-side functions for managing league configuration
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for server-side use
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Default league ID for Premier League (fallback)
export const DEFAULT_LEAGUE_API_ID = 39

export interface LeagueConfig {
  id: string           // UUID
  apiId: number        // API-Football league ID
  name: string
  country: string
  logo: string
  currentSeason: number
  oddsSportKey: string | null // The Odds API sport key
  countryCode: string | null
  isActive: boolean
  displayOrder: number
  settings: Record<string, any>
}

/**
 * Transform database row to LeagueConfig
 */
function transformLeague(row: any): LeagueConfig {
  return {
    id: row.id,
    apiId: row.api_id,
    name: row.name,
    country: row.country,
    logo: row.logo,
    currentSeason: row.current_season,
    oddsSportKey: row.odds_sport_key,
    countryCode: row.country_code,
    isActive: row.is_active ?? false,
    displayOrder: row.display_order ?? 999,
    settings: row.settings ?? {},
  }
}

/**
 * Get all active leagues
 */
export async function getActiveLeagues(): Promise<LeagueConfig[]> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching active leagues:', error)
    return []
  }

  return (data || []).map(transformLeague)
}

/**
 * Get all configured leagues (including inactive)
 */
export async function getAllLeagues(): Promise<LeagueConfig[]> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching all leagues:', error)
    return []
  }

  return (data || []).map(transformLeague)
}

/**
 * Get league by UUID
 */
export async function getLeagueById(id: string): Promise<LeagueConfig | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching league by ID:', error)
    return null
  }

  return data ? transformLeague(data) : null
}

/**
 * Get league by API-Football league ID
 */
export async function getLeagueByApiId(apiId: number): Promise<LeagueConfig | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('api_id', apiId)
    .single()

  if (error) {
    console.error('Error fetching league by API ID:', error)
    return null
  }

  return data ? transformLeague(data) : null
}

/**
 * Get the default league (Premier League)
 */
export async function getDefaultLeague(): Promise<LeagueConfig> {
  const league = await getLeagueByApiId(DEFAULT_LEAGUE_API_ID)

  if (!league) {
    // Fallback if database doesn't have Premier League
    return {
      id: '',
      apiId: DEFAULT_LEAGUE_API_ID,
      name: 'Premier League',
      country: 'England',
      logo: 'https://media.api-sports.io/football/leagues/39.png',
      currentSeason: 2025,
      oddsSportKey: 'soccer_epl',
      countryCode: 'GB',
      isActive: true,
      displayOrder: 1,
      settings: {},
    }
  }

  return league
}

/**
 * Get league from request, falling back to default
 * Use this in API routes to get the current league context
 */
export async function getLeagueFromRequest(request: Request): Promise<LeagueConfig> {
  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('league_id')

  if (leagueId) {
    const league = await getLeagueById(leagueId)
    if (league) return league
  }

  // Check for api_id parameter (alternative)
  const apiId = searchParams.get('api_id')
  if (apiId) {
    const league = await getLeagueByApiId(parseInt(apiId, 10))
    if (league) return league
  }

  return getDefaultLeague()
}

/**
 * Get league ID from cookies (for server components)
 * Returns the league ID from the cookie, or null if not set
 */
export function getLeagueIdFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  return cookies['football-prediction-league'] || null
}

/**
 * Get league from cookies, falling back to default
 * Use this in Server Components to get the current league
 */
export async function getLeagueFromCookies(cookieHeader: string | null): Promise<LeagueConfig> {
  const leagueId = getLeagueIdFromCookies(cookieHeader)

  if (leagueId) {
    const league = await getLeagueById(leagueId)
    if (league) return league
  }

  return getDefaultLeague()
}

/**
 * Toggle league active status
 */
export async function setLeagueActive(id: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('leagues')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) {
    console.error('Error updating league active status:', error)
    return false
  }

  return true
}

/**
 * Update league configuration
 */
export async function updateLeagueConfig(
  id: string,
  config: Partial<{
    currentSeason: number
    oddsSportKey: string
    isActive: boolean
    displayOrder: number
    settings: Record<string, any>
  }>
): Promise<boolean> {
  const updateData: Record<string, any> = {}

  if (config.currentSeason !== undefined) updateData.current_season = config.currentSeason
  if (config.oddsSportKey !== undefined) updateData.odds_sport_key = config.oddsSportKey
  if (config.isActive !== undefined) updateData.is_active = config.isActive
  if (config.displayOrder !== undefined) updateData.display_order = config.displayOrder
  if (config.settings !== undefined) updateData.settings = config.settings

  const { error } = await supabase
    .from('leagues')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating league config:', error)
    return false
  }

  return true
}

/**
 * Add a new league
 */
export async function addLeague(league: {
  apiId: number
  name: string
  country: string
  logo: string
  currentSeason: number
  oddsSportKey?: string
  countryCode?: string
}): Promise<LeagueConfig | null> {
  const { data, error } = await supabase
    .from('leagues')
    .insert({
      api_id: league.apiId,
      name: league.name,
      country: league.country,
      logo: league.logo,
      current_season: league.currentSeason,
      odds_sport_key: league.oddsSportKey,
      country_code: league.countryCode,
      is_active: false, // New leagues start inactive
      display_order: 999,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding league:', error)
    return null
  }

  return data ? transformLeague(data) : null
}

/**
 * Odds API sport key mapping for common leagues
 * Use this to suggest sport keys when adding new leagues
 */
export const ODDS_SPORT_KEYS: Record<number, string> = {
  39: 'soccer_epl',                    // Premier League
  40: 'soccer_england_championship',   // Championship
  41: 'soccer_england_league1',        // League One
  42: 'soccer_england_league2',        // League Two
  140: 'soccer_spain_la_liga',         // La Liga
  141: 'soccer_spain_segunda_division', // La Liga 2
  78: 'soccer_germany_bundesliga',     // Bundesliga
  79: 'soccer_germany_bundesliga2',    // 2. Bundesliga
  135: 'soccer_italy_serie_a',         // Serie A
  136: 'soccer_italy_serie_b',         // Serie B
  61: 'soccer_france_ligue_one',       // Ligue 1
  62: 'soccer_france_ligue_two',       // Ligue 2
  88: 'soccer_netherlands_eredivisie', // Eredivisie
  94: 'soccer_portugal_primeira_liga', // Primeira Liga
  144: 'soccer_belgium_first_div',     // Belgian Pro League
  203: 'soccer_turkey_super_league',   // Super Lig
  207: 'soccer_switzerland_superleague', // Swiss Super League
  218: 'soccer_germany_dfb_pokal',     // DFB Pokal
  2: 'soccer_uefa_champs_league',      // Champions League
  3: 'soccer_uefa_europa_league',      // Europa League
  848: 'soccer_uefa_europa_conference_league', // Conference League
}

/**
 * Get suggested odds sport key for a league API ID
 */
export function getSuggestedOddsSportKey(apiId: number): string | undefined {
  return ODDS_SPORT_KEYS[apiId]
}
