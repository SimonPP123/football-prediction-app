/**
 * API-Football Client Helper
 * Centralized functions for fetching data from API-Football
 */

const API_BASE = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
const LEAGUE_ID = 39; // Premier League
const SEASON = 2025;

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

export async function fetchAllFixtures() {
  return fetchFromAPI(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
}

export async function fetchStandings() {
  return fetchFromAPI(`/standings?league=${LEAGUE_ID}&season=${SEASON}`);
}

export async function fetchTeamStats(teamApiId: number) {
  return fetchFromAPI(`/teams/statistics?league=${LEAGUE_ID}&season=${SEASON}&team=${teamApiId}`);
}

export async function fetchInjuries() {
  return fetchFromAPI(`/injuries?league=${LEAGUE_ID}&season=${SEASON}`);
}

export async function fetchFixtureStats(fixtureApiId: number) {
  return fetchFromAPI(`/fixtures/statistics?fixture=${fixtureApiId}`);
}

export async function fetchFixtureEvents(fixtureApiId: number) {
  return fetchFromAPI(`/fixtures/events?fixture=${fixtureApiId}`);
}

// Teams and Venues
export async function fetchTeams() {
  return fetchFromAPI(`/teams?league=${LEAGUE_ID}&season=${SEASON}`);
}

// Lineups
export async function fetchLineups(fixtureApiId: number) {
  return fetchFromAPI(`/fixtures/lineups?fixture=${fixtureApiId}`);
}

// Head-to-Head
export async function fetchHeadToHead(team1ApiId: number, team2ApiId: number, last: number = 10) {
  return fetchFromAPI(`/fixtures/headtohead?h2h=${team1ApiId}-${team2ApiId}&last=${last}`);
}

// Player Squads
export async function fetchPlayerSquads(teamApiId: number) {
  return fetchFromAPI(`/players/squads?team=${teamApiId}`);
}

// Players (paginated)
export async function fetchPlayers(page: number = 1) {
  return fetchFromAPI(`/players?league=${LEAGUE_ID}&season=${SEASON}&page=${page}`);
}

// Top Performers
export async function fetchTopScorers() {
  return fetchFromAPI(`/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`);
}

export async function fetchTopAssists() {
  return fetchFromAPI(`/players/topassists?league=${LEAGUE_ID}&season=${SEASON}`);
}

export async function fetchTopYellowCards() {
  return fetchFromAPI(`/players/topyellowcards?league=${LEAGUE_ID}&season=${SEASON}`);
}

export async function fetchTopRedCards() {
  return fetchFromAPI(`/players/topredcards?league=${LEAGUE_ID}&season=${SEASON}`);
}

// Coaches
export async function fetchCoach(teamApiId: number) {
  return fetchFromAPI(`/coachs?team=${teamApiId}`);
}

// Transfers
export async function fetchTransfers(teamApiId: number) {
  return fetchFromAPI(`/transfers?team=${teamApiId}`);
}

// API Predictions (from API-Football)
export async function fetchAPIPredictions(fixtureApiId: number) {
  return fetchFromAPI(`/predictions?fixture=${fixtureApiId}`);
}

// Bulk fixtures with stats (for completed matches)
export async function fetchFixturesBulk(fixtureIds: number[]) {
  // API-Football allows fetching multiple fixtures at once
  const idsParam = fixtureIds.join('-');
  return fetchFromAPI(`/fixtures?ids=${idsParam}`);
}

// Get endpoint URL for display (without making request)
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

// Endpoint configuration for display
export const ENDPOINTS = {
  teams: {
    path: '/teams',
    params: { league: LEAGUE_ID, season: SEASON },
    get url() { return getEndpointUrl(this.path, this.params); }
  },
  fixtures: {
    path: '/fixtures',
    params: { league: LEAGUE_ID, season: SEASON },
    get url() { return getEndpointUrl(this.path, this.params); }
  },
  standings: {
    path: '/standings',
    params: { league: LEAGUE_ID, season: SEASON },
    get url() { return getEndpointUrl(this.path, this.params); }
  },
  teamStats: {
    path: '/teams/statistics',
    params: { league: LEAGUE_ID, season: SEASON, team: '{team_id}' },
    get url() { return getEndpointUrl(this.path, this.params); }
  },
  injuries: {
    path: '/injuries',
    params: { league: LEAGUE_ID, season: SEASON },
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
    params: { league: LEAGUE_ID, season: SEASON, page: '{page}' },
    get url() { return getEndpointUrl(this.path, this.params); }
  },
  topScorers: {
    path: '/players/topscorers',
    params: { league: LEAGUE_ID, season: SEASON },
    get url() { return getEndpointUrl(this.path, this.params); }
  },
  topAssists: {
    path: '/players/topassists',
    params: { league: LEAGUE_ID, season: SEASON },
    get url() { return getEndpointUrl(this.path, this.params); }
  },
  topYellowCards: {
    path: '/players/topyellowcards',
    params: { league: LEAGUE_ID, season: SEASON },
    get url() { return getEndpointUrl(this.path, this.params); }
  },
  topRedCards: {
    path: '/players/topredcards',
    params: { league: LEAGUE_ID, season: SEASON },
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

export { LEAGUE_ID, SEASON, API_BASE };
