/**
 * API-Football Client Helper
 * Centralized functions for fetching data from API-Football
 *
 * All functions now accept league and season parameters for multi-league support.
 * Parameters are optional and default to Premier League 2025 for backward compatibility.
 *
 * Features:
 * - Exponential backoff retry (1s, 2s, 4s) for 5xx errors
 * - 30s timeout with AbortController
 * - Rate limit tracking
 */

const API_BASE = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';

// Default values for backward compatibility
const DEFAULT_LEAGUE_ID = 39; // Premier League
const DEFAULT_SEASON = 2025;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// Export defaults for components that need them
export const LEAGUE_ID = DEFAULT_LEAGUE_ID;
export const SEASON = DEFAULT_SEASON;

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (5xx server errors)
 */
function isRetryableError(status: number): boolean {
  return status >= 500 && status < 600;
}

export async function fetchFromAPI(endpoint: string): Promise<any> {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured');
  }

  const url = `${API_BASE}${endpoint}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      console.log(`[API-Football] Fetching: ${url}${attempt > 0 ? ` (retry ${attempt})` : ''}`);

      const response = await fetch(url, {
        headers: {
          'x-apisports-key': apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Log rate limit info
      const remaining = response.headers.get('x-ratelimit-requests-remaining');
      console.log(`[API-Football] Rate limit remaining: ${remaining}`);

      // Check for retryable server errors
      if (isRetryableError(response.status)) {
        lastError = new Error(`API-Football error: ${response.status} ${response.statusText}`);
        console.warn(`[API-Football] Server error ${response.status}, will retry...`);

        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.log(`[API-Football] Waiting ${delay}ms before retry...`);
          await sleep(delay);
          continue;
        }
        throw lastError;
      }

      // Non-retryable errors (4xx)
      if (!response.ok) {
        throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`API-Football request timed out after ${REQUEST_TIMEOUT_MS}ms`);
        console.warn(`[API-Football] Request timed out, attempt ${attempt + 1}/${MAX_RETRIES}`);

        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
        throw lastError;
      }

      // Network errors - retry
      if (error instanceof TypeError && error.message.includes('fetch')) {
        lastError = error;
        console.warn(`[API-Football] Network error, attempt ${attempt + 1}/${MAX_RETRIES}`);

        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }

      // Re-throw non-retryable errors
      throw error;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error('API-Football request failed after retries');
}

// =====================================================
// FIXTURES
// =====================================================

export async function fetchAllFixtures(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/fixtures?league=${leagueApiId}&season=${season}`);
}

/**
 * Fetch the next X upcoming fixtures for a league
 * @param count - Number of fixtures to fetch (default 10, max 99)
 * @param leagueApiId - League API ID
 * @param season - Season year
 */
export async function fetchFixturesNext(
  count: number = 10,
  leagueApiId: number = DEFAULT_LEAGUE_ID,
  season: number = DEFAULT_SEASON
) {
  const clampedCount = Math.min(99, Math.max(1, count));
  console.log(`[API-Football] Fetching next ${clampedCount} fixtures for league ${leagueApiId}`);
  return fetchFromAPI(`/fixtures?league=${leagueApiId}&season=${season}&next=${clampedCount}`);
}

/**
 * Fetch the last X completed fixtures for a league
 * @param count - Number of fixtures to fetch (default 10, max 99)
 * @param leagueApiId - League API ID
 * @param season - Season year
 */
export async function fetchFixturesLast(
  count: number = 10,
  leagueApiId: number = DEFAULT_LEAGUE_ID,
  season: number = DEFAULT_SEASON
) {
  const clampedCount = Math.min(99, Math.max(1, count));
  console.log(`[API-Football] Fetching last ${clampedCount} fixtures for league ${leagueApiId}`);
  return fetchFromAPI(`/fixtures?league=${leagueApiId}&season=${season}&last=${clampedCount}`);
}

/**
 * Fetch currently live fixtures for specific league(s) or all leagues
 * @param leagueApiId - League API ID or 'all' for all leagues
 */
export async function fetchLiveFixturesByLeague(leagueApiId: number | 'all' = DEFAULT_LEAGUE_ID) {
  const param = leagueApiId === 'all' ? 'all' : String(leagueApiId);
  console.log(`[API-Football] Fetching live fixtures for: ${param}`);
  return fetchFromAPI(`/fixtures?live=${param}`);
}

/**
 * Fetch fixtures for a specific date
 * @param date - Date string in YYYY-MM-DD format
 * @param leagueApiId - League API ID
 * @param season - Season year
 */
export async function fetchFixturesByDate(
  date: string,
  leagueApiId: number = DEFAULT_LEAGUE_ID,
  season: number = DEFAULT_SEASON
) {
  console.log(`[API-Football] Fetching fixtures for date ${date}`);
  return fetchFromAPI(`/fixtures?league=${leagueApiId}&season=${season}&date=${date}`);
}

/**
 * Fetch fixtures within a specific date range (smart filtering)
 * This reduces API calls by only fetching relevant fixtures
 *
 * @param leagueApiId - League API ID (e.g., 39 for Premier League)
 * @param season - Season year (e.g., 2025)
 * @param from - Start date for the range
 * @param to - End date for the range
 */
export async function fetchFixturesInRange(
  leagueApiId: number = DEFAULT_LEAGUE_ID,
  season: number = DEFAULT_SEASON,
  from: Date,
  to: Date
) {
  const fromStr = from.toISOString().split('T')[0]; // YYYY-MM-DD
  const toStr = to.toISOString().split('T')[0];
  console.log(`[API-Football] Fetching fixtures from ${fromStr} to ${toStr}`);
  return fetchFromAPI(`/fixtures?league=${leagueApiId}&season=${season}&from=${fromStr}&to=${toStr}`);
}

/**
 * Fetch fixtures by status (e.g., only live or only completed)
 *
 * @param status - Status code (NS, 1H, 2H, HT, FT, etc.) or comma-separated statuses
 * @param date - Optional specific date (YYYY-MM-DD)
 */
export async function fetchFixturesByStatus(
  leagueApiId: number = DEFAULT_LEAGUE_ID,
  season: number = DEFAULT_SEASON,
  status: string,
  date?: string
) {
  let endpoint = `/fixtures?league=${leagueApiId}&season=${season}&status=${status}`;
  if (date) {
    endpoint += `&date=${date}`;
  }
  return fetchFromAPI(endpoint);
}

/**
 * Fetch live fixtures only (currently in progress)
 */
export async function fetchLiveFixtures(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  // API-Football live statuses: 1H, 2H, HT, ET, BT, P, INT, LIVE
  return fetchFixturesByStatus(leagueApiId, season, '1H-2H-HT-ET-BT-P-INT-LIVE');
}

/**
 * Fetch today's fixtures
 */
export async function fetchTodayFixtures(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  const today = new Date().toISOString().split('T')[0];
  return fetchFromAPI(`/fixtures?league=${leagueApiId}&season=${season}&date=${today}`);
}

export async function fetchFixturesByIds(fixtureIds: number[]) {
  // API-Football allows fetching multiple fixtures at once
  const idsParam = fixtureIds.join('-');
  return fetchFromAPI(`/fixtures?ids=${idsParam}`);
}

export async function fetchFixtureStats(fixtureApiId: number) {
  return fetchFromAPI(`/fixtures/statistics?fixture=${fixtureApiId}`);
}

export async function fetchFixtureEvents(fixtureApiId: number) {
  return fetchFromAPI(`/fixtures/events?fixture=${fixtureApiId}`);
}

// Alias for backward compatibility
export async function fetchFixturesBulk(fixtureIds: number[]) {
  return fetchFixturesByIds(fixtureIds);
}

// =====================================================
// STANDINGS
// =====================================================

export async function fetchStandings(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/standings?league=${leagueApiId}&season=${season}`);
}

// =====================================================
// TEAMS
// =====================================================

export async function fetchTeams(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/teams?league=${leagueApiId}&season=${season}`);
}

export async function fetchTeamStats(teamApiId: number, leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/teams/statistics?league=${leagueApiId}&season=${season}&team=${teamApiId}`);
}

// =====================================================
// INJURIES
// =====================================================

export async function fetchInjuries(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/injuries?league=${leagueApiId}&season=${season}`);
}

/**
 * Fetch injuries for specific fixture IDs
 * @param fixtureApiIds - Array of fixture API IDs (max 20 per request)
 */
export async function fetchInjuriesByFixtures(fixtureApiIds: number[]) {
  if (fixtureApiIds.length === 0) {
    return { response: [] };
  }
  // API-Football allows max 20 fixture IDs per request
  const ids = fixtureApiIds.slice(0, 20).join('-');
  console.log(`[API-Football] Fetching injuries for ${fixtureApiIds.length} fixtures`);
  return fetchFromAPI(`/injuries?ids=${ids}`);
}

/**
 * Fetch injuries for a specific fixture
 * @param fixtureApiId - Fixture API ID
 */
export async function fetchInjuriesByFixture(fixtureApiId: number) {
  console.log(`[API-Football] Fetching injuries for fixture ${fixtureApiId}`);
  return fetchFromAPI(`/injuries?fixture=${fixtureApiId}`);
}

/**
 * Fetch injuries for a specific date
 * @param date - Date string in YYYY-MM-DD format
 */
export async function fetchInjuriesByDate(date: string) {
  console.log(`[API-Football] Fetching injuries for date ${date}`);
  return fetchFromAPI(`/injuries?date=${date}`);
}

// =====================================================
// LINEUPS
// =====================================================

export async function fetchLineups(fixtureApiId: number) {
  return fetchFromAPI(`/fixtures/lineups?fixture=${fixtureApiId}`);
}

// =====================================================
// HEAD-TO-HEAD
// =====================================================

export async function fetchHeadToHead(team1ApiId: number, team2ApiId: number, last: number = 10) {
  return fetchFromAPI(`/fixtures/headtohead?h2h=${team1ApiId}-${team2ApiId}&last=${last}`);
}

// =====================================================
// PLAYERS
// =====================================================

export async function fetchPlayers(page: number = 1, leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/players?league=${leagueApiId}&season=${season}&page=${page}`);
}

export async function fetchPlayerSquads(teamApiId: number) {
  return fetchFromAPI(`/players/squads?team=${teamApiId}`);
}

// =====================================================
// TOP PERFORMERS
// =====================================================

export async function fetchTopScorers(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/players/topscorers?league=${leagueApiId}&season=${season}`);
}

export async function fetchTopAssists(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/players/topassists?league=${leagueApiId}&season=${season}`);
}

export async function fetchTopYellowCards(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/players/topyellowcards?league=${leagueApiId}&season=${season}`);
}

export async function fetchTopRedCards(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/players/topredcards?league=${leagueApiId}&season=${season}`);
}

// =====================================================
// COACHES
// =====================================================

export async function fetchCoach(teamApiId: number) {
  return fetchFromAPI(`/coachs?team=${teamApiId}`);
}

// =====================================================
// TRANSFERS
// =====================================================

export async function fetchTransfers(teamApiId: number) {
  return fetchFromAPI(`/transfers?team=${teamApiId}`);
}

// =====================================================
// API PREDICTIONS
// =====================================================

export async function fetchAPIPredictions(fixtureApiId: number) {
  return fetchFromAPI(`/predictions?fixture=${fixtureApiId}`);
}

// =====================================================
// LEAGUES (for league discovery)
// =====================================================

export async function fetchAvailableLeagues(country?: string) {
  const endpoint = country
    ? `/leagues?country=${encodeURIComponent(country)}`
    : '/leagues';
  return fetchFromAPI(endpoint);
}

export async function fetchLeagueById(leagueApiId: number) {
  return fetchFromAPI(`/leagues?id=${leagueApiId}`);
}

// =====================================================
// ENDPOINT URL HELPERS (for display purposes)
// =====================================================

export function getEndpointUrl(endpoint: string, params?: Record<string, string | number>): string {
  const baseUrl = API_BASE;
  if (params) {
    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${baseUrl}${endpoint}?${queryString}`;
  }
  return `${baseUrl}${endpoint}`;
}

// Dynamic endpoint configuration that can be updated with league context
export function getEndpoints(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return {
    teams: {
      path: '/teams',
      params: { league: leagueApiId, season },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    fixtures: {
      path: '/fixtures',
      params: { league: leagueApiId, season },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    standings: {
      path: '/standings',
      params: { league: leagueApiId, season },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    teamStats: {
      path: '/teams/statistics',
      params: { league: leagueApiId, season, team: '{team_id}' },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    injuries: {
      path: '/injuries',
      params: { league: leagueApiId, season },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    fixtureStatistics: {
      path: '/fixtures/statistics',
      params: { fixture: '{fixture_id}' },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    fixtureEvents: {
      path: '/fixtures/events',
      params: { fixture: '{fixture_id}' },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    lineups: {
      path: '/fixtures/lineups',
      params: { fixture: '{fixture_id}' },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    headToHead: {
      path: '/fixtures/headtohead',
      params: { h2h: '{team1_id}-{team2_id}', last: 10 },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    playerSquads: {
      path: '/players/squads',
      params: { team: '{team_id}' },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    players: {
      path: '/players',
      params: { league: leagueApiId, season, page: '{page}' },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    topScorers: {
      path: '/players/topscorers',
      params: { league: leagueApiId, season },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    topAssists: {
      path: '/players/topassists',
      params: { league: leagueApiId, season },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    topYellowCards: {
      path: '/players/topyellowcards',
      params: { league: leagueApiId, season },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    topRedCards: {
      path: '/players/topredcards',
      params: { league: leagueApiId, season },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    coaches: {
      path: '/coachs',
      params: { team: '{team_id}' },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
    transfers: {
      path: '/transfers',
      params: { team: '{team_id}' },
      get url() { return getEndpointUrl(this.path, this.params); }
    },
  } as const;
}

// Static endpoint configuration for backward compatibility (uses defaults)
export const ENDPOINTS = getEndpoints();

export { API_BASE };
