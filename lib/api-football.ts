/**
 * API-Football Client Helper
 * Centralized functions for fetching data from API-Football
 *
 * All functions now accept league and season parameters for multi-league support.
 * Parameters are optional and default to Premier League 2025 for backward compatibility.
 */

const API_BASE = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';

// Default values for backward compatibility
const DEFAULT_LEAGUE_ID = 39; // Premier League
const DEFAULT_SEASON = 2025;

// Export defaults for components that need them
export const LEAGUE_ID = DEFAULT_LEAGUE_ID;
export const SEASON = DEFAULT_SEASON;

export async function fetchFromAPI(endpoint: string): Promise<any> {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not configured');
  }

  const url = `${API_BASE}${endpoint}`;
  console.log(`[API-Football] Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Log rate limit info
  const remaining = response.headers.get('x-ratelimit-requests-remaining');
  console.log(`[API-Football] Rate limit remaining: ${remaining}`);

  return data;
}

// =====================================================
// FIXTURES
// =====================================================

export async function fetchAllFixtures(leagueApiId: number = DEFAULT_LEAGUE_ID, season: number = DEFAULT_SEASON) {
  return fetchFromAPI(`/fixtures?league=${leagueApiId}&season=${season}`);
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
