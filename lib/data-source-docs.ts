/**
 * Data Source Documentation
 * Central source of truth for all API endpoint and database documentation
 * Used by both inline details panels and the dedicated docs page
 */

// External API configuration
export interface ExternalApiConfig {
  name: string
  baseUrl: string
  docsUrl?: string
  authMethod: 'header' | 'query'
  authHeader?: string
  authParam?: string
}

// API endpoint documentation
export interface EndpointDoc {
  method: 'GET' | 'POST'
  path: string
  params: Record<string, {
    type: 'string' | 'number' | 'boolean'
    required: boolean
    description: string
    example: string | number | boolean
    default?: string | number
  }>
  description: string
  responseExample?: object
}

// Database column documentation
export interface ColumnDoc {
  name: string
  type: string
  nullable: boolean
  description: string
  source?: string // API field that maps to this column
}

// Database table documentation
export interface TableDoc {
  name: string
  description: string
  columns: ColumnDoc[]
  indexes?: string[]
  uniqueConstraints?: string[]
}

// Complete data source documentation
export interface DataSourceDoc {
  id: string
  name: string
  description: string
  longDescription: string
  externalApi: ExternalApiConfig | null
  endpoints: EndpointDoc[]
  tables: TableDoc[]
  affectedTables?: string[]
  refreshSchedule: string
  dependencies: string[]
  dependents: string[]
  exampleData: {
    apiResponse?: object
    dbRecord?: object
  }
  notes?: string[]
}

// External API configurations
const API_FOOTBALL: ExternalApiConfig = {
  name: 'API-Football',
  baseUrl: 'https://v3.football.api-sports.io',
  docsUrl: 'https://www.api-football.com/documentation-v3',
  authMethod: 'header',
  authHeader: 'x-apisports-key',
}

const THE_ODDS_API: ExternalApiConfig = {
  name: 'The Odds API',
  baseUrl: 'https://api.the-odds-api.com/v4',
  docsUrl: 'https://the-odds-api.com/liveapi/guides/v4/',
  authMethod: 'query',
  authParam: 'apiKey',
}

const OPEN_METEO: ExternalApiConfig = {
  name: 'Open-Meteo',
  baseUrl: 'https://api.open-meteo.com/v1',
  docsUrl: 'https://open-meteo.com/en/docs',
  authMethod: 'query', // No auth needed
}

// Complete documentation for all data sources
export const DATA_SOURCE_DOCS: Record<string, DataSourceDoc> = {
  // ===== CORE FOUNDATION =====
  leagues: {
    id: 'leagues',
    name: 'Leagues',
    description: 'League information (Premier League)',
    longDescription: 'Static league configuration data. Currently only contains Premier League (api_id: 39). Pre-configured in database migrations and not refreshed via API.',
    externalApi: null,
    endpoints: [],
    tables: [{
      name: 'leagues',
      description: 'League metadata',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'api_id', type: 'INTEGER', nullable: false, description: 'API-Football league ID (39 for EPL)' },
        { name: 'name', type: 'TEXT', nullable: false, description: 'League name' },
        { name: 'country', type: 'TEXT', nullable: true, description: 'Country' },
        { name: 'logo', type: 'TEXT', nullable: true, description: 'League logo URL' },
        { name: 'current_season', type: 'INTEGER', nullable: true, description: 'Active season year' },
      ],
    }],
    refreshSchedule: 'Static (pre-configured)',
    dependencies: [],
    dependents: ['fixtures', 'standings', 'team_season_stats', 'top_performers'],
    exampleData: {
      dbRecord: { id: 'uuid', api_id: 39, name: 'Premier League', country: 'England', current_season: 2025 }
    },
  },

  venues: {
    id: 'venues',
    name: 'Venues',
    description: 'Stadium and venue data',
    longDescription: 'Stadium information including location coordinates for weather lookups. Updated automatically when Teams are refreshed - venue data is embedded in the teams API response.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/teams',
      params: {
        league: { type: 'number', required: true, description: 'League ID', example: 39 },
        season: { type: 'number', required: true, description: 'Season year', example: 2025 },
      },
      description: 'Fetches teams with embedded venue data',
      responseExample: { response: [{ team: { id: 33, name: 'Manchester United' }, venue: { id: 555, name: 'Old Trafford', city: 'Manchester', capacity: 76212 } }] },
    }],
    tables: [{
      name: 'venues',
      description: 'Stadium data',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'api_id', type: 'INTEGER', nullable: true, description: 'API-Football venue ID', source: 'venue.id' },
        { name: 'name', type: 'TEXT', nullable: false, description: 'Stadium name', source: 'venue.name' },
        { name: 'city', type: 'TEXT', nullable: true, description: 'City', source: 'venue.city' },
        { name: 'capacity', type: 'INTEGER', nullable: true, description: 'Seating capacity', source: 'venue.capacity' },
        { name: 'surface', type: 'TEXT', nullable: true, description: 'Pitch surface type', source: 'venue.surface' },
        { name: 'lat', type: 'DECIMAL', nullable: true, description: 'Latitude (for weather lookups)' },
        { name: 'lng', type: 'DECIMAL', nullable: true, description: 'Longitude (for weather lookups)' },
      ],
    }],
    refreshSchedule: 'Season start (via Teams refresh)',
    dependencies: [],
    dependents: ['teams', 'fixtures', 'weather'],
    exampleData: {
      dbRecord: { id: 'uuid', api_id: 555, name: 'Old Trafford', city: 'Manchester', capacity: 76212, surface: 'grass', lat: 53.4631, lng: -2.2913 }
    },
    notes: ['Latitude/longitude must be set for weather lookups', 'Venue data comes embedded in Teams API response'],
  },

  teams: {
    id: 'teams',
    name: 'Teams',
    description: 'Club information and logos',
    longDescription: 'Premier League team data including names, codes, logos, and venue associations. This is foundation data that most other endpoints depend on. Also creates/updates venue records.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/teams',
      params: {
        league: { type: 'number', required: true, description: 'League ID', example: 39 },
        season: { type: 'number', required: true, description: 'Season year', example: 2025 },
      },
      description: 'Fetches all teams in a league for a season',
      responseExample: { response: [{ team: { id: 33, name: 'Manchester United', code: 'MUN', logo: 'https://...' }, venue: { id: 555, name: 'Old Trafford' } }] },
    }],
    tables: [{
      name: 'teams',
      description: 'Club data',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'api_id', type: 'INTEGER', nullable: false, description: 'API-Football team ID', source: 'team.id' },
        { name: 'name', type: 'TEXT', nullable: false, description: 'Full team name', source: 'team.name' },
        { name: 'code', type: 'TEXT', nullable: true, description: '3-letter code', source: 'team.code' },
        { name: 'country', type: 'TEXT', nullable: true, description: 'Country', source: 'team.country' },
        { name: 'logo', type: 'TEXT', nullable: true, description: 'Team logo URL', source: 'team.logo' },
        { name: 'venue_id', type: 'UUID', nullable: true, description: 'FK to venues table' },
      ],
    }],
    affectedTables: ['venues'],
    refreshSchedule: 'Season start (August)',
    dependencies: [],
    dependents: ['fixtures', 'standings', 'injuries', 'team_season_stats', 'head_to_head', 'players', 'coaches', 'transfers'],
    exampleData: {
      apiResponse: { team: { id: 33, name: 'Manchester United', code: 'MUN' }, venue: { id: 555, name: 'Old Trafford' } },
      dbRecord: { id: 'uuid', api_id: 33, name: 'Manchester United', code: 'MUN', logo: 'https://...' }
    },
  },

  fixtures: {
    id: 'fixtures',
    name: 'Fixtures',
    description: 'Match schedule and results',
    longDescription: 'Complete Premier League fixture list for the season. Includes match dates, venues, referees, and final scores. Updated daily to reflect rescheduled matches and completed results.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/fixtures',
      params: {
        league: { type: 'number', required: true, description: 'League ID', example: 39 },
        season: { type: 'number', required: true, description: 'Season year', example: 2025 },
      },
      description: 'Fetches all fixtures for a league season',
      responseExample: { response: [{ fixture: { id: 12345, date: '2025-08-16T14:00:00+00:00', referee: 'M. Oliver', status: { short: 'NS' } }, teams: { home: { id: 33, name: 'Manchester United' }, away: { id: 40, name: 'Liverpool' } }, goals: { home: null, away: null } }] },
    }],
    tables: [{
      name: 'fixtures',
      description: 'Match schedule and results',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'api_id', type: 'INTEGER', nullable: false, description: 'API-Football fixture ID', source: 'fixture.id' },
        { name: 'league_id', type: 'UUID', nullable: false, description: 'FK to leagues' },
        { name: 'home_team_id', type: 'UUID', nullable: false, description: 'FK to teams' },
        { name: 'away_team_id', type: 'UUID', nullable: false, description: 'FK to teams' },
        { name: 'venue_id', type: 'UUID', nullable: true, description: 'FK to venues' },
        { name: 'match_date', type: 'TIMESTAMPTZ', nullable: false, description: 'Kickoff time (UTC)', source: 'fixture.date' },
        { name: 'round', type: 'TEXT', nullable: true, description: 'Matchweek (e.g., "Regular Season - 1")', source: 'league.round' },
        { name: 'status', type: 'TEXT', nullable: true, description: 'Match status code', source: 'fixture.status.short' },
        { name: 'goals_home', type: 'INTEGER', nullable: true, description: 'Home team goals', source: 'goals.home' },
        { name: 'goals_away', type: 'INTEGER', nullable: true, description: 'Away team goals', source: 'goals.away' },
        { name: 'referee', type: 'TEXT', nullable: true, description: 'Match referee', source: 'fixture.referee' },
      ],
    }],
    refreshSchedule: 'Daily at 06:00 UTC',
    dependencies: ['teams', 'venues', 'leagues'],
    dependents: ['fixture_statistics', 'fixture_events', 'lineups', 'odds', 'weather', 'predictions', 'head_to_head'],
    exampleData: {
      dbRecord: { id: 'uuid', api_id: 12345, status: 'NS', match_date: '2025-08-16T14:00:00Z', round: 'Regular Season - 1' }
    },
    notes: [
      'Status codes: NS=Not Started, 1H=First Half, HT=Half Time, 2H=Second Half, FT=Full Time, AET=After Extra Time, PEN=Penalties',
      'Referee name may be null until close to kickoff',
    ],
  },

  // ===== MATCH DATA =====
  standings: {
    id: 'standings',
    name: 'Standings',
    description: 'League table positions',
    longDescription: 'Current Premier League standings including points, goal difference, form, and home/away splits. Updated daily during the season.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/standings',
      params: {
        league: { type: 'number', required: true, description: 'League ID', example: 39 },
        season: { type: 'number', required: true, description: 'Season year', example: 2025 },
      },
      description: 'Fetches current league standings',
      responseExample: { response: [{ league: { standings: [[{ rank: 1, team: { id: 50, name: 'Manchester City' }, points: 89, goalsDiff: 52, form: 'WWWWW' }]] } }] },
    }],
    tables: [{
      name: 'standings',
      description: 'League table',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'team_id', type: 'UUID', nullable: false, description: 'FK to teams' },
        { name: 'league_id', type: 'UUID', nullable: false, description: 'FK to leagues' },
        { name: 'season', type: 'INTEGER', nullable: false, description: 'Season year' },
        { name: 'rank', type: 'INTEGER', nullable: false, description: 'League position', source: 'rank' },
        { name: 'points', type: 'INTEGER', nullable: false, description: 'Total points', source: 'points' },
        { name: 'played', type: 'INTEGER', nullable: false, description: 'Matches played', source: 'all.played' },
        { name: 'won', type: 'INTEGER', nullable: false, description: 'Matches won', source: 'all.win' },
        { name: 'drawn', type: 'INTEGER', nullable: false, description: 'Matches drawn', source: 'all.draw' },
        { name: 'lost', type: 'INTEGER', nullable: false, description: 'Matches lost', source: 'all.lose' },
        { name: 'goals_for', type: 'INTEGER', nullable: false, description: 'Goals scored', source: 'all.goals.for' },
        { name: 'goals_against', type: 'INTEGER', nullable: false, description: 'Goals conceded', source: 'all.goals.against' },
        { name: 'goal_diff', type: 'INTEGER', nullable: false, description: 'Goal difference', source: 'goalsDiff' },
        { name: 'form', type: 'TEXT', nullable: true, description: 'Last 5 results (WWLDL)', source: 'form' },
      ],
    }],
    refreshSchedule: 'Daily at 06:00 UTC',
    dependencies: ['teams', 'leagues'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: { team_id: 'uuid', rank: 1, points: 89, played: 38, won: 28, drawn: 5, lost: 5, goal_diff: 52, form: 'WWWWW' }
    },
  },

  fixture_statistics: {
    id: 'fixture_statistics',
    name: 'Fixture Statistics',
    description: 'Match statistics (shots, possession, etc.)',
    longDescription: 'Detailed match statistics including shots, possession, passes, fouls, and more. Only available for completed matches. Used for historical analysis and model training.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/fixtures/statistics',
      params: {
        fixture: { type: 'number', required: true, description: 'Fixture ID', example: 12345 },
      },
      description: 'Fetches statistics for a specific fixture',
      responseExample: { response: [{ team: { id: 33 }, statistics: [{ type: 'Shots on Goal', value: 5 }, { type: 'Ball Possession', value: '55%' }] }] },
    }],
    tables: [{
      name: 'fixture_statistics',
      description: 'Per-match statistics',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'fixture_id', type: 'UUID', nullable: false, description: 'FK to fixtures' },
        { name: 'team_id', type: 'UUID', nullable: false, description: 'FK to teams' },
        { name: 'shots_on_goal', type: 'INTEGER', nullable: true, description: 'Shots on target' },
        { name: 'shots_off_goal', type: 'INTEGER', nullable: true, description: 'Shots off target' },
        { name: 'total_shots', type: 'INTEGER', nullable: true, description: 'Total shots' },
        { name: 'blocked_shots', type: 'INTEGER', nullable: true, description: 'Blocked shots' },
        { name: 'shots_inside_box', type: 'INTEGER', nullable: true, description: 'Shots inside box' },
        { name: 'shots_outside_box', type: 'INTEGER', nullable: true, description: 'Shots outside box' },
        { name: 'fouls', type: 'INTEGER', nullable: true, description: 'Fouls committed' },
        { name: 'corners', type: 'INTEGER', nullable: true, description: 'Corner kicks' },
        { name: 'offsides', type: 'INTEGER', nullable: true, description: 'Offsides' },
        { name: 'possession', type: 'TEXT', nullable: true, description: 'Ball possession %' },
        { name: 'yellow_cards', type: 'INTEGER', nullable: true, description: 'Yellow cards' },
        { name: 'red_cards', type: 'INTEGER', nullable: true, description: 'Red cards' },
        { name: 'saves', type: 'INTEGER', nullable: true, description: 'Goalkeeper saves' },
        { name: 'passes_total', type: 'INTEGER', nullable: true, description: 'Total passes' },
        { name: 'passes_accurate', type: 'INTEGER', nullable: true, description: 'Accurate passes' },
        { name: 'expected_goals', type: 'DECIMAL', nullable: true, description: 'Expected goals (xG)' },
      ],
    }],
    refreshSchedule: 'After match completion',
    dependencies: ['fixtures', 'teams'],
    dependents: ['team_season_stats', 'predictions'],
    exampleData: {
      dbRecord: { fixture_id: 'uuid', team_id: 'uuid', shots_on_goal: 5, possession: '55%', expected_goals: 1.85 }
    },
    notes: ['Only available for completed matches (status FT, AET, PEN)', 'xG may be null for some matches'],
  },

  fixture_events: {
    id: 'fixture_events',
    name: 'Fixture Events',
    description: 'Goals, cards, substitutions',
    longDescription: 'Timeline of match events including goals, assists, cards, substitutions, and VAR decisions. Used for referee statistics and detailed match analysis.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/fixtures/events',
      params: {
        fixture: { type: 'number', required: true, description: 'Fixture ID', example: 12345 },
      },
      description: 'Fetches events for a specific fixture',
      responseExample: { response: [{ time: { elapsed: 23 }, team: { id: 33 }, player: { id: 123, name: 'M. Rashford' }, type: 'Goal', detail: 'Normal Goal' }] },
    }],
    tables: [{
      name: 'fixture_events',
      description: 'Match events timeline',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'fixture_id', type: 'UUID', nullable: false, description: 'FK to fixtures' },
        { name: 'team_id', type: 'UUID', nullable: true, description: 'FK to teams' },
        { name: 'player_id', type: 'UUID', nullable: true, description: 'FK to players' },
        { name: 'player_name', type: 'TEXT', nullable: true, description: 'Player name' },
        { name: 'assist_id', type: 'UUID', nullable: true, description: 'Assisting player FK' },
        { name: 'assist_name', type: 'TEXT', nullable: true, description: 'Assisting player name' },
        { name: 'type', type: 'TEXT', nullable: false, description: 'Event type', source: 'type' },
        { name: 'detail', type: 'TEXT', nullable: true, description: 'Event detail', source: 'detail' },
        { name: 'time_elapsed', type: 'INTEGER', nullable: false, description: 'Minute of event', source: 'time.elapsed' },
        { name: 'time_extra', type: 'INTEGER', nullable: true, description: 'Added time', source: 'time.extra' },
      ],
    }],
    refreshSchedule: 'After match completion',
    dependencies: ['fixtures', 'teams', 'players'],
    dependents: ['referee_stats'],
    exampleData: {
      dbRecord: { fixture_id: 'uuid', type: 'Goal', detail: 'Normal Goal', time_elapsed: 23, player_name: 'M. Rashford' }
    },
    notes: [
      'Event types: Goal, Card, subst (substitution), Var',
      'Card details: Yellow Card, Red Card, Second Yellow card',
      'Goal details: Normal Goal, Own Goal, Penalty, Missed Penalty',
    ],
  },

  lineups: {
    id: 'lineups',
    name: 'Lineups',
    description: 'Starting XI and formations',
    longDescription: 'Team lineups including formation, starting XI, and substitutes. Only available approximately 1 hour before kickoff. Critical for prediction accuracy.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/fixtures/lineups',
      params: {
        fixture: { type: 'number', required: true, description: 'Fixture ID', example: 12345 },
      },
      description: 'Fetches lineups for a specific fixture',
      responseExample: { response: [{ team: { id: 33 }, formation: '4-2-3-1', startXI: [{ player: { id: 123, name: 'A. Onana', number: 24, pos: 'G' } }] }] },
    }],
    tables: [{
      name: 'lineups',
      description: 'Match lineups',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'fixture_id', type: 'UUID', nullable: false, description: 'FK to fixtures' },
        { name: 'team_id', type: 'UUID', nullable: false, description: 'FK to teams' },
        { name: 'formation', type: 'TEXT', nullable: true, description: 'Team formation', source: 'formation' },
        { name: 'starting_xi', type: 'JSONB', nullable: true, description: 'Starting 11 players', source: 'startXI' },
        { name: 'substitutes', type: 'JSONB', nullable: true, description: 'Substitute players', source: 'substitutes' },
        { name: 'coach_name', type: 'TEXT', nullable: true, description: 'Coach name', source: 'coach.name' },
      ],
    }],
    refreshSchedule: '~1 hour before kickoff',
    dependencies: ['fixtures', 'teams'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: { fixture_id: 'uuid', team_id: 'uuid', formation: '4-2-3-1', starting_xi: [{ player: { id: 123, name: 'A. Onana', number: 24, pos: 'G' } }] }
    },
    notes: ['Only available ~1 hour before kickoff', 'May change due to late injuries or tactical decisions'],
  },

  // ===== TEAM INTELLIGENCE =====
  team_season_stats: {
    id: 'team_season_stats',
    name: 'Team Season Stats',
    description: 'Aggregated team statistics',
    longDescription: 'Season-wide team statistics including goals, clean sheets, form, and performance metrics. Used as key inputs for prediction models.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/teams/statistics',
      params: {
        league: { type: 'number', required: true, description: 'League ID', example: 39 },
        season: { type: 'number', required: true, description: 'Season year', example: 2025 },
        team: { type: 'number', required: true, description: 'Team ID', example: 33 },
      },
      description: 'Fetches season statistics for a specific team',
      responseExample: { response: { form: 'WWLWW', goals: { for: { total: { home: 45, away: 32 } }, against: { total: { home: 15, away: 22 } } }, clean_sheet: { home: 10, away: 5 } } },
    }],
    tables: [{
      name: 'team_season_stats',
      description: 'Aggregated season statistics',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'team_id', type: 'UUID', nullable: false, description: 'FK to teams' },
        { name: 'league_id', type: 'UUID', nullable: false, description: 'FK to leagues' },
        { name: 'season', type: 'INTEGER', nullable: false, description: 'Season year' },
        { name: 'form', type: 'TEXT', nullable: true, description: 'Recent form string', source: 'form' },
        { name: 'goals_for_home', type: 'INTEGER', nullable: true, description: 'Home goals scored' },
        { name: 'goals_for_away', type: 'INTEGER', nullable: true, description: 'Away goals scored' },
        { name: 'goals_against_home', type: 'INTEGER', nullable: true, description: 'Home goals conceded' },
        { name: 'goals_against_away', type: 'INTEGER', nullable: true, description: 'Away goals conceded' },
        { name: 'clean_sheets_home', type: 'INTEGER', nullable: true, description: 'Home clean sheets' },
        { name: 'clean_sheets_away', type: 'INTEGER', nullable: true, description: 'Away clean sheets' },
        { name: 'failed_to_score_home', type: 'INTEGER', nullable: true, description: 'Home matches without scoring' },
        { name: 'failed_to_score_away', type: 'INTEGER', nullable: true, description: 'Away matches without scoring' },
        { name: 'avg_goals_for', type: 'DECIMAL', nullable: true, description: 'Average goals per match' },
        { name: 'avg_goals_against', type: 'DECIMAL', nullable: true, description: 'Average goals conceded' },
      ],
    }],
    refreshSchedule: 'Weekly (Sundays)',
    dependencies: ['teams', 'leagues'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: { team_id: 'uuid', season: 2025, form: 'WWLWW', goals_for_home: 45, goals_against_home: 15, clean_sheets_home: 10 }
    },
    notes: ['Rate limited: 300ms delay per team', 'Uses 20 API calls (one per team)'],
  },

  injuries: {
    id: 'injuries',
    name: 'Injuries',
    description: 'Current injury list',
    longDescription: 'Active injuries and suspensions for all Premier League players. Includes injury type, expected return date, and player details. Critical for lineup predictions.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/injuries',
      params: {
        league: { type: 'number', required: true, description: 'League ID', example: 39 },
        season: { type: 'number', required: true, description: 'Season year', example: 2025 },
      },
      description: 'Fetches all current injuries for a league',
      responseExample: { response: [{ player: { id: 123, name: 'M. Rashford' }, team: { id: 33 }, fixture: { id: 12345 }, league: { id: 39 }, reason: 'Muscle Injury', type: 'Missing Fixture' }] },
    }],
    tables: [{
      name: 'injuries',
      description: 'Player injuries and suspensions',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'player_api_id', type: 'INTEGER', nullable: false, description: 'API-Football player ID', source: 'player.id' },
        { name: 'player_id', type: 'UUID', nullable: true, description: 'FK to players (if exists)' },
        { name: 'player_name', type: 'TEXT', nullable: false, description: 'Player name', source: 'player.name' },
        { name: 'player_photo', type: 'TEXT', nullable: true, description: 'Player photo URL', source: 'player.photo' },
        { name: 'team_id', type: 'UUID', nullable: true, description: 'FK to teams' },
        { name: 'team_api_id', type: 'INTEGER', nullable: false, description: 'API team ID', source: 'team.id' },
        { name: 'fixture_id', type: 'UUID', nullable: true, description: 'Affected fixture FK' },
        { name: 'reason', type: 'TEXT', nullable: true, description: 'Injury description', source: 'player.reason' },
        { name: 'type', type: 'TEXT', nullable: true, description: 'Injury type', source: 'player.type' },
      ],
    }],
    refreshSchedule: 'Daily at 07:30 UTC',
    dependencies: ['teams'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: { player_name: 'M. Rashford', team_id: 'uuid', reason: 'Muscle Injury', type: 'Missing Fixture' }
    },
    notes: ['Type can be: Missing Fixture, Questionable, Doubtful', 'Cleared before each refresh (replaced entirely)'],
  },

  head_to_head: {
    id: 'head_to_head',
    name: 'Head to Head',
    description: 'Historical matchups',
    longDescription: 'Historical results between two teams including past scores, venues, and statistics. Used for rivalry analysis and prediction models.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/fixtures/headtohead',
      params: {
        h2h: { type: 'string', required: true, description: 'Team IDs separated by dash', example: '33-40' },
        last: { type: 'number', required: false, description: 'Number of past matches', example: 10, default: 10 },
      },
      description: 'Fetches head-to-head history between two teams',
      responseExample: { response: [{ fixture: { id: 11111, date: '2024-03-10' }, teams: { home: { id: 33, winner: true }, away: { id: 40, winner: false } }, goals: { home: 2, away: 1 } }] },
    }],
    tables: [{
      name: 'head_to_head',
      description: 'Historical matchup results',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'team1_id', type: 'UUID', nullable: false, description: 'FK to teams (first team)' },
        { name: 'team2_id', type: 'UUID', nullable: false, description: 'FK to teams (second team)' },
        { name: 'fixture_api_id', type: 'INTEGER', nullable: false, description: 'API fixture ID', source: 'fixture.id' },
        { name: 'match_date', type: 'TIMESTAMPTZ', nullable: false, description: 'Match date', source: 'fixture.date' },
        { name: 'home_team_id', type: 'UUID', nullable: false, description: 'Home team FK' },
        { name: 'away_team_id', type: 'UUID', nullable: false, description: 'Away team FK' },
        { name: 'goals_home', type: 'INTEGER', nullable: true, description: 'Home goals', source: 'goals.home' },
        { name: 'goals_away', type: 'INTEGER', nullable: true, description: 'Away goals', source: 'goals.away' },
        { name: 'venue', type: 'TEXT', nullable: true, description: 'Venue name', source: 'fixture.venue.name' },
      ],
    }],
    refreshSchedule: 'Weekly',
    dependencies: ['teams', 'fixtures'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: { team1_id: 'uuid1', team2_id: 'uuid2', match_date: '2024-03-10', goals_home: 2, goals_away: 1 }
    },
    notes: ['Fetches last 10 matches per fixture', 'Uses 300ms delay between fixtures to respect rate limits'],
  },

  // ===== PLAYER DATA =====
  players: {
    id: 'players',
    name: 'Players',
    description: 'Player profiles',
    longDescription: 'Basic player information including name, position, nationality, and photo. Created automatically when fetching player squads.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/players/squads',
      params: {
        team: { type: 'number', required: true, description: 'Team ID', example: 33 },
      },
      description: 'Fetches squad with player details',
      responseExample: { response: [{ team: { id: 33 }, players: [{ id: 123, name: 'M. Rashford', age: 26, number: 10, position: 'Attacker', photo: 'https://...' }] }] },
    }],
    tables: [{
      name: 'players',
      description: 'Player profiles',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'api_id', type: 'INTEGER', nullable: false, description: 'API-Football player ID', source: 'id' },
        { name: 'name', type: 'TEXT', nullable: false, description: 'Player name', source: 'name' },
        { name: 'firstname', type: 'TEXT', nullable: true, description: 'First name' },
        { name: 'lastname', type: 'TEXT', nullable: true, description: 'Last name' },
        { name: 'age', type: 'INTEGER', nullable: true, description: 'Player age', source: 'age' },
        { name: 'nationality', type: 'TEXT', nullable: true, description: 'Nationality' },
        { name: 'height', type: 'TEXT', nullable: true, description: 'Height' },
        { name: 'weight', type: 'TEXT', nullable: true, description: 'Weight' },
        { name: 'photo', type: 'TEXT', nullable: true, description: 'Photo URL', source: 'photo' },
      ],
    }],
    refreshSchedule: 'Via Player Squads refresh',
    dependencies: [],
    dependents: ['player_squads', 'player_season_stats', 'fixture_events', 'injuries'],
    exampleData: {
      dbRecord: { api_id: 123, name: 'M. Rashford', age: 26, photo: 'https://...' }
    },
  },

  player_squads: {
    id: 'player_squads',
    name: 'Player Squads',
    description: 'Team rosters',
    longDescription: 'Current squad composition for each team including player numbers and positions. Also creates/updates player records.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/players/squads',
      params: {
        team: { type: 'number', required: true, description: 'Team ID', example: 33 },
      },
      description: 'Fetches current squad for a team',
      responseExample: { response: [{ team: { id: 33, name: 'Manchester United' }, players: [{ id: 123, name: 'M. Rashford', number: 10, position: 'Attacker' }] }] },
    }],
    tables: [{
      name: 'player_squads',
      description: 'Team-player relationships',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'team_id', type: 'UUID', nullable: false, description: 'FK to teams' },
        { name: 'player_id', type: 'UUID', nullable: false, description: 'FK to players' },
        { name: 'number', type: 'INTEGER', nullable: true, description: 'Squad number', source: 'number' },
        { name: 'position', type: 'TEXT', nullable: true, description: 'Playing position', source: 'position' },
      ],
    }],
    affectedTables: ['players'],
    refreshSchedule: 'Monthly or after transfers',
    dependencies: ['teams'],
    dependents: [],
    exampleData: {
      dbRecord: { team_id: 'uuid', player_id: 'uuid', number: 10, position: 'Attacker' }
    },
    notes: ['Position values: Goalkeeper, Defender, Midfielder, Attacker', 'Creates new player records if not found'],
  },

  player_season_stats: {
    id: 'player_season_stats',
    name: 'Player Stats',
    description: 'Season statistics per player',
    longDescription: 'Individual player statistics for the current season including goals, assists, minutes played, and more. Used for player performance analysis.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/players',
      params: {
        league: { type: 'number', required: true, description: 'League ID', example: 39 },
        season: { type: 'number', required: true, description: 'Season year', example: 2025 },
        page: { type: 'number', required: false, description: 'Pagination page', example: 1 },
      },
      description: 'Fetches player statistics with pagination',
      responseExample: { response: [{ player: { id: 123, name: 'M. Rashford' }, statistics: [{ games: { appearences: 25, minutes: 2100 }, goals: { total: 10, assists: 5 } }] }], paging: { current: 1, total: 10 } },
    }],
    tables: [{
      name: 'player_season_stats',
      description: 'Season statistics',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'player_id', type: 'UUID', nullable: false, description: 'FK to players' },
        { name: 'team_id', type: 'UUID', nullable: true, description: 'FK to teams' },
        { name: 'season', type: 'INTEGER', nullable: false, description: 'Season year' },
        { name: 'appearances', type: 'INTEGER', nullable: true, description: 'Matches played', source: 'games.appearences' },
        { name: 'minutes', type: 'INTEGER', nullable: true, description: 'Minutes played', source: 'games.minutes' },
        { name: 'goals', type: 'INTEGER', nullable: true, description: 'Goals scored', source: 'goals.total' },
        { name: 'assists', type: 'INTEGER', nullable: true, description: 'Assists', source: 'goals.assists' },
        { name: 'yellow_cards', type: 'INTEGER', nullable: true, description: 'Yellow cards', source: 'cards.yellow' },
        { name: 'red_cards', type: 'INTEGER', nullable: true, description: 'Red cards', source: 'cards.red' },
        { name: 'rating', type: 'DECIMAL', nullable: true, description: 'Average rating', source: 'games.rating' },
      ],
    }],
    refreshSchedule: 'Weekly',
    dependencies: ['players', 'teams'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: { player_id: 'uuid', season: 2025, appearances: 25, goals: 10, assists: 5, rating: 7.2 }
    },
    notes: ['Paginated API - fetches all pages automatically', 'Rating is 0-10 scale'],
  },

  top_performers: {
    id: 'top_performers',
    name: 'Top Performers',
    description: 'League leaders by category',
    longDescription: 'Top scorers, assist leaders, and card leaders for the current season. Shows rankings and statistics for each category.',
    externalApi: API_FOOTBALL,
    endpoints: [
      {
        method: 'GET',
        path: '/players/topscorers',
        params: {
          league: { type: 'number', required: true, description: 'League ID', example: 39 },
          season: { type: 'number', required: true, description: 'Season year', example: 2025 },
        },
        description: 'Fetches top scorers',
      },
      {
        method: 'GET',
        path: '/players/topassists',
        params: {
          league: { type: 'number', required: true, description: 'League ID', example: 39 },
          season: { type: 'number', required: true, description: 'Season year', example: 2025 },
        },
        description: 'Fetches top assist providers',
      },
    ],
    tables: [{
      name: 'top_performers',
      description: 'League leader rankings',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'league_id', type: 'UUID', nullable: false, description: 'FK to leagues' },
        { name: 'season', type: 'INTEGER', nullable: false, description: 'Season year' },
        { name: 'category', type: 'TEXT', nullable: false, description: 'Category (goals, assists, yellow_cards, red_cards)' },
        { name: 'rank', type: 'INTEGER', nullable: false, description: 'Ranking position' },
        { name: 'player_api_id', type: 'INTEGER', nullable: false, description: 'API player ID' },
        { name: 'player_id', type: 'UUID', nullable: true, description: 'FK to players' },
        { name: 'player_name', type: 'TEXT', nullable: false, description: 'Player name' },
        { name: 'player_photo', type: 'TEXT', nullable: true, description: 'Photo URL' },
        { name: 'team_id', type: 'UUID', nullable: true, description: 'FK to teams' },
        { name: 'team_name', type: 'TEXT', nullable: true, description: 'Team name' },
        { name: 'value', type: 'INTEGER', nullable: false, description: 'Stat value (goals/assists/cards)' },
        { name: 'appearances', type: 'INTEGER', nullable: true, description: 'Matches played' },
      ],
    }],
    refreshSchedule: 'Weekly',
    dependencies: ['leagues', 'teams', 'players'],
    dependents: [],
    exampleData: {
      dbRecord: { category: 'goals', rank: 1, player_name: 'E. Haaland', team_name: 'Manchester City', value: 25 }
    },
  },

  coaches: {
    id: 'coaches',
    name: 'Coaches',
    description: 'Manager information',
    longDescription: 'Current head coaches for all Premier League teams including career history. Updated when teams change managers.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/coachs',
      params: {
        team: { type: 'number', required: true, description: 'Team ID', example: 33 },
      },
      description: 'Fetches coach for a specific team',
      responseExample: { response: [{ id: 1, name: 'E. ten Hag', firstname: 'Erik', lastname: 'ten Hag', age: 54, nationality: 'Netherlands', photo: 'https://...' }] },
    }],
    tables: [{
      name: 'coaches',
      description: 'Manager profiles',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'api_id', type: 'INTEGER', nullable: false, description: 'API coach ID', source: 'id' },
        { name: 'name', type: 'TEXT', nullable: false, description: 'Full name', source: 'name' },
        { name: 'firstname', type: 'TEXT', nullable: true, description: 'First name', source: 'firstname' },
        { name: 'lastname', type: 'TEXT', nullable: true, description: 'Last name', source: 'lastname' },
        { name: 'age', type: 'INTEGER', nullable: true, description: 'Age', source: 'age' },
        { name: 'nationality', type: 'TEXT', nullable: true, description: 'Nationality', source: 'nationality' },
        { name: 'photo', type: 'TEXT', nullable: true, description: 'Photo URL', source: 'photo' },
        { name: 'team_id', type: 'UUID', nullable: true, description: 'Current team FK' },
        { name: 'career', type: 'JSONB', nullable: true, description: 'Career history', source: 'career' },
      ],
    }],
    refreshSchedule: 'Monthly or after manager changes',
    dependencies: ['teams'],
    dependents: [],
    exampleData: {
      dbRecord: { api_id: 1, name: 'E. ten Hag', team_id: 'uuid', nationality: 'Netherlands' }
    },
  },

  // ===== EXTERNAL DATA =====
  odds: {
    id: 'odds',
    name: 'Odds',
    description: 'Betting odds from multiple bookmakers',
    longDescription: 'Real-time betting odds from The Odds API. Supports 8 market types: Match Result (h2h), Asian Handicap (spreads), Over/Under (totals), Both Teams To Score (btts), Double Chance, Draw No Bet, First Half Result, Second Half Result. UK bookmakers only.',
    externalApi: THE_ODDS_API,
    endpoints: [{
      method: 'GET',
      path: '/sports/soccer_epl/odds',
      params: {
        apiKey: { type: 'string', required: true, description: 'API key', example: '***' },
        regions: { type: 'string', required: true, description: 'Bookmaker regions', example: 'uk' },
        markets: { type: 'string', required: true, description: 'Comma-separated market types', example: 'h2h,spreads,totals,btts,double_chance,draw_no_bet,h2h_h1,h2h_h2' },
      },
      description: 'Fetches current odds for all EPL matches',
      responseExample: { id: 'abc123', sport_key: 'soccer_epl', home_team: 'Manchester United', away_team: 'Liverpool', bookmakers: [{ key: 'bet365', title: 'Bet365', markets: [{ key: 'h2h', outcomes: [{ name: 'Manchester United', price: 2.80 }] }] }] },
    }],
    tables: [{
      name: 'odds',
      description: 'Betting odds by fixture/bookmaker/market',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'fixture_id', type: 'UUID', nullable: false, description: 'FK to fixtures' },
        { name: 'bookmaker', type: 'TEXT', nullable: false, description: 'Bookmaker name', source: 'bookmakers[].title' },
        { name: 'bet_type', type: 'TEXT', nullable: false, description: 'Market type (h2h, btts, etc.)', source: 'bookmakers[].markets[].key' },
        { name: 'values', type: 'JSONB', nullable: false, description: 'Array of outcomes with prices', source: 'bookmakers[].markets[].outcomes' },
        { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Last update time' },
      ],
      uniqueConstraints: ['fixture_id, bookmaker, bet_type'],
    }],
    refreshSchedule: 'Every 4 hours on matchday',
    dependencies: ['fixtures'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: {
        fixture_id: 'uuid',
        bookmaker: 'Bet365',
        bet_type: 'btts',
        values: [{ name: 'Yes', price: 1.72 }, { name: 'No', price: 2.10 }]
      }
    },
    notes: [
      'Markets: h2h, spreads, totals, btts, double_chance, draw_no_bet, h2h_h1, h2h_h2',
      'Team names may differ from database - uses fuzzy matching with aliases',
      'Only fetches odds for fixtures with status "NS" (Not Started)',
      'Each market request costs 1 API credit',
    ],
  },

  weather: {
    id: 'weather',
    name: 'Weather',
    description: 'Match weather conditions',
    longDescription: 'Weather forecast for match venues including temperature, wind, rain probability, and conditions. Uses free Open-Meteo API with venue coordinates.',
    externalApi: OPEN_METEO,
    endpoints: [{
      method: 'GET',
      path: '/forecast',
      params: {
        latitude: { type: 'number', required: true, description: 'Venue latitude', example: 53.4631 },
        longitude: { type: 'number', required: true, description: 'Venue longitude', example: -2.2913 },
        hourly: { type: 'string', required: true, description: 'Requested data', example: 'temperature_2m,precipitation_probability,windspeed_10m,weathercode' },
      },
      description: 'Fetches hourly weather forecast',
      responseExample: { hourly: { time: ['2025-08-16T14:00'], temperature_2m: [18.5], precipitation_probability: [20], windspeed_10m: [12.5], weathercode: [3] } },
    }],
    tables: [{
      name: 'weather',
      description: 'Match weather forecasts',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'fixture_id', type: 'UUID', nullable: false, description: 'FK to fixtures' },
        { name: 'temperature', type: 'DECIMAL', nullable: true, description: 'Temperature in Celsius', source: 'temperature_2m' },
        { name: 'feels_like', type: 'DECIMAL', nullable: true, description: 'Feels-like temperature' },
        { name: 'humidity', type: 'INTEGER', nullable: true, description: 'Humidity percentage' },
        { name: 'wind_speed', type: 'DECIMAL', nullable: true, description: 'Wind speed km/h', source: 'windspeed_10m' },
        { name: 'wind_direction', type: 'INTEGER', nullable: true, description: 'Wind direction degrees' },
        { name: 'rain_chance', type: 'INTEGER', nullable: true, description: 'Precipitation probability %', source: 'precipitation_probability' },
        { name: 'conditions', type: 'TEXT', nullable: true, description: 'Weather description' },
        { name: 'weather_code', type: 'INTEGER', nullable: true, description: 'WMO weather code', source: 'weathercode' },
      ],
    }],
    refreshSchedule: 'Daily at 09:00 UTC',
    dependencies: ['fixtures', 'venues'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: { fixture_id: 'uuid', temperature: 18.5, wind_speed: 12.5, rain_chance: 20, conditions: 'Partly cloudy' }
    },
    notes: [
      'Requires venue lat/lng coordinates',
      'Free API - no rate limits',
      'Weather codes: 0=Clear, 1-3=Cloudy, 51-67=Rain, 71-77=Snow',
    ],
  },

  referee_stats: {
    id: 'referee_stats',
    name: 'Referee Stats',
    description: 'Referee tendencies and history',
    longDescription: 'Aggregated referee statistics computed from fixture data including cards per match, penalty rates, and home/away bias. Not fetched from external API - computed locally.',
    externalApi: null,
    endpoints: [],
    tables: [{
      name: 'referee_stats',
      description: 'Referee statistics',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'name', type: 'TEXT', nullable: false, description: 'Referee name (unique)' },
        { name: 'matches_refereed', type: 'INTEGER', nullable: false, description: 'Total matches' },
        { name: 'avg_yellow_cards', type: 'DECIMAL', nullable: true, description: 'Average yellow cards per match' },
        { name: 'avg_red_cards', type: 'DECIMAL', nullable: true, description: 'Average red cards per match' },
        { name: 'avg_fouls', type: 'DECIMAL', nullable: true, description: 'Average fouls per match' },
        { name: 'penalties_per_match', type: 'DECIMAL', nullable: true, description: 'Penalties awarded per match' },
        { name: 'home_win_pct', type: 'DECIMAL', nullable: true, description: 'Home win percentage' },
        { name: 'away_win_pct', type: 'DECIMAL', nullable: true, description: 'Away win percentage' },
        { name: 'draw_pct', type: 'DECIMAL', nullable: true, description: 'Draw percentage' },
      ],
      uniqueConstraints: ['name'],
    }],
    refreshSchedule: 'After fixtures refresh',
    dependencies: ['fixtures', 'fixture_events'],
    dependents: ['predictions'],
    exampleData: {
      dbRecord: { name: 'M. Oliver', matches_refereed: 150, avg_yellow_cards: 3.2, avg_red_cards: 0.15, home_win_pct: 48.5 }
    },
    notes: ['Computed from fixtures and fixture_events tables', 'No external API calls'],
  },

  transfers: {
    id: 'transfers',
    name: 'Transfers',
    description: 'Player transfer history',
    longDescription: 'Player transfer records including dates, clubs, and transfer types (permanent, loan). Historical data for all Premier League teams.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/transfers',
      params: {
        team: { type: 'number', required: true, description: 'Team ID', example: 33 },
      },
      description: 'Fetches transfer history for a team',
      responseExample: { response: [{ player: { id: 123, name: 'M. Rashford' }, transfers: [{ date: '2016-01-01', type: 'N/A', teams: { in: { id: 33 }, out: { id: null } } }] }] },
    }],
    tables: [{
      name: 'transfers',
      description: 'Player transfers',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'player_api_id', type: 'INTEGER', nullable: false, description: 'API player ID' },
        { name: 'player_id', type: 'UUID', nullable: true, description: 'FK to players' },
        { name: 'player_name', type: 'TEXT', nullable: false, description: 'Player name' },
        { name: 'from_team_api_id', type: 'INTEGER', nullable: true, description: 'Origin team API ID' },
        { name: 'from_team_id', type: 'UUID', nullable: true, description: 'FK to origin team' },
        { name: 'from_team_name', type: 'TEXT', nullable: true, description: 'Origin team name' },
        { name: 'to_team_api_id', type: 'INTEGER', nullable: true, description: 'Destination team API ID' },
        { name: 'to_team_id', type: 'UUID', nullable: true, description: 'FK to destination team' },
        { name: 'to_team_name', type: 'TEXT', nullable: true, description: 'Destination team name' },
        { name: 'transfer_date', type: 'DATE', nullable: true, description: 'Transfer date', source: 'date' },
        { name: 'transfer_type', type: 'TEXT', nullable: true, description: 'Type (Loan, N/A=permanent, Free)', source: 'type' },
      ],
      uniqueConstraints: ['player_api_id, transfer_date, from_team_api_id, to_team_api_id'],
    }],
    refreshSchedule: 'Weekly during transfer windows',
    dependencies: ['teams', 'players'],
    dependents: [],
    exampleData: {
      dbRecord: { player_name: 'M. Rashford', from_team_name: 'Youth', to_team_name: 'Manchester United', transfer_date: '2016-01-01', transfer_type: 'N/A' }
    },
    notes: ['Transfer type N/A typically means permanent transfer', 'Duplicates are ignored during upsert'],
  },

  // ===== AI PREDICTIONS =====
  predictions: {
    id: 'predictions',
    name: 'AI Predictions',
    description: 'Generated match predictions',
    longDescription: 'AI-generated match predictions using GPT-4o with comprehensive factor analysis (A-I factors). Includes confidence scores, predicted scores, and detailed reasoning.',
    externalApi: null,
    endpoints: [{
      method: 'POST',
      path: '/api/predictions/generate',
      params: {
        fixture_id: { type: 'string', required: true, description: 'Fixture UUID', example: 'uuid' },
      },
      description: 'Generates prediction for a specific fixture',
    }],
    tables: [{
      name: 'predictions',
      description: 'AI-generated predictions',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'fixture_id', type: 'UUID', nullable: false, description: 'FK to fixtures' },
        { name: 'prediction', type: 'TEXT', nullable: true, description: 'Predicted outcome (home/draw/away)' },
        { name: 'confidence', type: 'DECIMAL', nullable: true, description: 'Confidence 0-100' },
        { name: 'home_score', type: 'INTEGER', nullable: true, description: 'Predicted home goals' },
        { name: 'away_score', type: 'INTEGER', nullable: true, description: 'Predicted away goals' },
        { name: 'factors', type: 'JSONB', nullable: true, description: 'Factor breakdown (A-I)' },
        { name: 'reasoning', type: 'TEXT', nullable: true, description: 'AI explanation' },
        { name: 'overall_index', type: 'DECIMAL', nullable: true, description: 'Composite score 0-100' },
        { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Generation time' },
      ],
    }],
    refreshSchedule: 'On-demand via UI',
    dependencies: ['fixtures', 'standings', 'team_season_stats', 'injuries', 'odds', 'weather'],
    dependents: ['prediction_history'],
    exampleData: {
      dbRecord: { fixture_id: 'uuid', prediction: 'home', confidence: 72.5, home_score: 2, away_score: 1, overall_index: 65.3 }
    },
    notes: ['Uses n8n workflow for AI processing', 'Factors A-I with weighted scoring'],
  },

  prediction_history: {
    id: 'prediction_history',
    name: 'Prediction History',
    description: 'Past prediction accuracy',
    longDescription: 'Historical record of predictions with actual results for accuracy tracking. Automatically updated when matches complete.',
    externalApi: null,
    endpoints: [],
    tables: [{
      name: 'prediction_history',
      description: 'Prediction accuracy tracking',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'fixture_id', type: 'UUID', nullable: false, description: 'FK to fixtures' },
        { name: 'prediction_id', type: 'UUID', nullable: false, description: 'FK to predictions' },
        { name: 'predicted_outcome', type: 'TEXT', nullable: true, description: 'What was predicted' },
        { name: 'actual_outcome', type: 'TEXT', nullable: true, description: 'What happened' },
        { name: 'predicted_home_score', type: 'INTEGER', nullable: true, description: 'Predicted home goals' },
        { name: 'predicted_away_score', type: 'INTEGER', nullable: true, description: 'Predicted away goals' },
        { name: 'actual_home_score', type: 'INTEGER', nullable: true, description: 'Actual home goals' },
        { name: 'actual_away_score', type: 'INTEGER', nullable: true, description: 'Actual away goals' },
        { name: 'correct', type: 'BOOLEAN', nullable: true, description: 'Was prediction correct?' },
        { name: 'confidence', type: 'DECIMAL', nullable: true, description: 'Original confidence' },
      ],
    }],
    refreshSchedule: 'After match completion',
    dependencies: ['predictions', 'fixtures'],
    dependents: [],
    exampleData: {
      dbRecord: { predicted_outcome: 'home', actual_outcome: 'home', correct: true, confidence: 72.5 }
    },
  },

  api_predictions: {
    id: 'api_predictions',
    name: 'API Predictions',
    description: 'Third-party predictions',
    longDescription: 'Predictions from API-Football for comparison with our AI predictions. Includes their confidence percentages and advice.',
    externalApi: API_FOOTBALL,
    endpoints: [{
      method: 'GET',
      path: '/predictions',
      params: {
        fixture: { type: 'number', required: true, description: 'Fixture ID', example: 12345 },
      },
      description: 'Fetches prediction for a specific fixture',
      responseExample: { response: [{ predictions: { winner: { id: 33, name: 'Manchester United' }, percent: { home: '55%', draw: '25%', away: '20%' }, advice: 'Manchester United to win' } }] },
    }],
    tables: [{
      name: 'api_predictions',
      description: 'External predictions',
      columns: [
        { name: 'id', type: 'UUID', nullable: false, description: 'Primary key' },
        { name: 'fixture_id', type: 'UUID', nullable: false, description: 'FK to fixtures' },
        { name: 'winner_id', type: 'INTEGER', nullable: true, description: 'Predicted winner API ID' },
        { name: 'winner_name', type: 'TEXT', nullable: true, description: 'Predicted winner name' },
        { name: 'winner_comment', type: 'TEXT', nullable: true, description: 'Prediction rationale' },
        { name: 'win_or_draw', type: 'BOOLEAN', nullable: true, description: 'Win or draw expected' },
        { name: 'under_over', type: 'TEXT', nullable: true, description: 'Goals prediction' },
        { name: 'advice', type: 'TEXT', nullable: true, description: 'Betting advice' },
        { name: 'percent_home', type: 'TEXT', nullable: true, description: 'Home win %' },
        { name: 'percent_draw', type: 'TEXT', nullable: true, description: 'Draw %' },
        { name: 'percent_away', type: 'TEXT', nullable: true, description: 'Away win %' },
        { name: 'comparison', type: 'JSONB', nullable: true, description: 'Team comparison stats' },
        { name: 'h2h_summary', type: 'JSONB', nullable: true, description: 'H2H history' },
      ],
      uniqueConstraints: ['fixture_id'],
    }],
    refreshSchedule: 'Before matches (next 7 days)',
    dependencies: ['fixtures'],
    dependents: [],
    exampleData: {
      dbRecord: { fixture_id: 'uuid', winner_name: 'Manchester United', percent_home: '55%', percent_draw: '25%', percent_away: '20%', advice: 'Manchester United to win' }
    },
    notes: ['Only fetches for fixtures without existing predictions', 'Rate limited: 400ms between requests'],
  },
}

// Helper to get documentation by ID
export function getDataSourceDoc(id: string): DataSourceDoc | undefined {
  return DATA_SOURCE_DOCS[id]
}

// Helper to get all documentation as array
export function getAllDataSourceDocs(): DataSourceDoc[] {
  return Object.values(DATA_SOURCE_DOCS)
}

// Helper to get documentation by category
export function getDataSourceDocsByCategory(): Record<string, DataSourceDoc[]> {
  const categories: Record<string, string[]> = {
    core: ['leagues', 'venues', 'teams', 'fixtures'],
    match: ['standings', 'fixture_statistics', 'fixture_events', 'lineups'],
    team: ['team_season_stats', 'injuries', 'head_to_head'],
    player: ['players', 'player_squads', 'player_season_stats', 'top_performers', 'coaches'],
    external: ['odds', 'weather', 'referee_stats', 'transfers'],
    prediction: ['predictions', 'prediction_history', 'api_predictions'],
  }

  const result: Record<string, DataSourceDoc[]> = {}
  for (const [category, ids] of Object.entries(categories)) {
    result[category] = ids.map(id => DATA_SOURCE_DOCS[id]).filter(Boolean)
  }
  return result
}
