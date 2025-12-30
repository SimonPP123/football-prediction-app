// Database types
export interface Team {
  id: string
  api_id: number
  name: string
  code: string | null
  country: string | null
  logo: string | null
  venue_id: string | null
  created_at: string
}

export interface Fixture {
  id: string
  api_id: number
  league_id: string
  season: number
  round: string | null
  home_team_id: string
  away_team_id: string
  match_date: string
  venue_id: string | null
  referee: string | null
  status: string
  goals_home: number | null
  goals_away: number | null
  score_halftime: { home: number; away: number } | null
  score_fulltime: { home: number; away: number } | null
  created_at: string
  updated_at: string
}

export interface FixtureWithTeams extends Fixture {
  home_team: Team
  away_team: Team
  venue?: Venue
  prediction?: Prediction
}

export interface Venue {
  id: string
  api_id: number | null
  name: string
  city: string | null
  capacity: number | null
  surface: string | null
}

export interface Standing {
  id: string
  league_id: string
  season: number
  team_id: string
  rank: number
  points: number
  goal_diff: number
  form: string | null
  description: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  home_record: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } } | null
  away_record: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } } | null
  updated_at: string
  team?: Team
}

export interface ScorePrediction {
  score: string
  probability: number
}

export interface Prediction {
  id: string
  fixture_id: string
  overall_index: number | null
  prediction_result: '1' | 'X' | '2' | '1X' | 'X2' | '12' | null
  confidence_level: 'high' | 'medium' | 'low' | null
  confidence_pct: number | null
  certainty_score: number | null  // AI's independent certainty assessment (1-100%)
  factors: Record<string, any>
  analysis_text: string | null
  key_factors: string[] | null
  risk_factors: string[] | null
  model_version: string
  model_used: string | null
  score_predictions: ScorePrediction[] | null
  most_likely_score: string | null
  home_win_pct: number | null
  draw_pct: number | null
  away_win_pct: number | null
  over_under_2_5: string | null
  btts: string | null
  value_bet: string | null
  home_team_news: string | null    // Pre-match news/notes about home team
  away_team_news: string | null    // Pre-match news/notes about away team
  raw_ai_output: string | null     // Raw unprocessed output from AI agent
  created_at: string
  updated_at: string
}

export interface PredictionHistory {
  id: string
  fixture_id: string
  league_id: string | null  // Added for efficient league-based filtering
  model_used: string | null
  prediction_result: string | null
  overall_index: number | null
  factors: Record<string, any> | null
  score_predictions: ScorePrediction[] | null
  most_likely_score: string | null
  analysis_text: string | null
  key_factors: string[] | null
  risk_factors: string[] | null
  home_win_pct: number | null
  draw_pct: number | null
  away_win_pct: number | null
  over_under_2_5: string | null
  btts: string | null
  confidence_pct: number | null
  certainty_score: number | null  // AI's independent certainty assessment (1-100%)
  home_team_news: string | null   // Pre-match news/notes about home team
  away_team_news: string | null   // Pre-match news/notes about away team
  raw_ai_output: string | null    // Raw unprocessed output from AI agent
  created_at: string
}

export interface MatchAnalysis {
  id: string
  fixture_id: string
  league_id: string | null  // Added for efficient league-based filtering
  home_team_id: string
  away_team_id: string
  analyzed_prediction_history_id: string | null  // Reference to which prediction version was analyzed
  predicted_result: '1' | 'X' | '2' | null
  actual_result: '1' | 'X' | '2' | null
  prediction_correct: boolean
  predicted_score: string | null
  actual_score: string | null
  score_correct: boolean | null
  predicted_over_under: string | null
  actual_over_under: string | null
  over_under_correct: boolean | null
  predicted_btts: string | null
  actual_btts: string | null
  btts_correct: boolean | null
  overall_index: number | null
  confidence_pct: number | null
  accuracy_score: number | null
  factors: Record<string, any> | null
  factor_accuracy: Record<string, any> | null
  home_team_performance: Record<string, any> | null
  away_team_performance: Record<string, any> | null
  post_match_analysis: string | null
  key_insights: string[] | null
  learning_points: string[] | null
  surprises: string[] | null
  model_version: string | null
  analysis_type: string | null
  created_at: string
  updated_at: string
}

export const AI_MODELS = [
  // OpenAI - Mini Models Only
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },

  // Google - Gemini 2.5 Series
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
] as const

export type AIModelId = typeof AI_MODELS[number]['id']

export interface AIPrediction {
  prediction_1x2: '1' | 'X' | '2'
  confidence: number
  home_win_pct: number
  draw_pct: number
  away_win_pct: number
  over_under: string
  btts: 'Yes' | 'No'
  value_bet: string | null
  key_factors: string[]
  risk_factors: string[]
  summary: string
  detailed_analysis: string
}

export interface Player {
  id: string
  api_id: number
  name: string
  firstname: string | null
  lastname: string | null
  age: number | null
  birth_date: string | null
  nationality: string | null
  height: string | null
  weight: string | null
  photo: string | null
  injured: boolean
}

// Injury status values from API-Football
export type InjuryStatus = 'Missing Fixture' | 'Doubtful' | 'Questionable' | string

export interface Injury {
  id: string
  team_id: string
  player_id?: string | null
  player_api_id?: number | null
  player_name: string
  // Status: "Missing Fixture", "Doubtful", "Questionable"
  injury_type?: string | null
  // Reason: "Knee Injury", "Suspended", "Illness", etc.
  injury_reason?: string | null
  reported_date?: string | null
  created_at: string
  // Joined data from teams table
  team?: {
    id: string
    name: string
    logo?: string | null
    league_id?: string | null
  }
  // Legacy fields (may be present in old data)
  type?: string | null
  reason?: string | null
}

export interface Coach {
  id: string
  api_id: number
  name: string
  firstname: string | null
  lastname: string | null
  nationality: string | null
  photo: string | null
  team_id: string | null
}

export interface TopPerformer {
  id: string
  league_id: string
  season: number
  category: 'goals' | 'assists' | 'yellow_cards' | 'red_cards'
  rank: number
  player_api_id: number | null
  player_id: string | null
  player_name: string
  player_photo: string | null
  team_api_id: number | null
  team_id: string | null
  team_name: string | null
  team_logo: string | null
  value: number
  appearances: number | null
}

export interface TeamSeasonStats {
  id: string
  team_id: string
  league_id: string
  season: number
  fixtures_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goals_for_avg: number | null
  goals_against_avg: number | null
  clean_sheets: number
  failed_to_score: number
  form: string | null
  home_stats: Record<string, any> | null
  away_stats: Record<string, any> | null
}

export interface HeadToHead {
  id: string
  team1_id: string
  team2_id: string
  matches_played: number
  team1_wins: number
  team2_wins: number
  draws: number
  team1_goals: number
  team2_goals: number
  last_fixtures: Array<{
    date: string
    home_team: string
    away_team: string
    home_goals: number
    away_goals: number
  }> | null
}

// Odds types
export interface OddsOutcome {
  name: string         // "Home", "Draw", "Away" or team name
  price: number        // Decimal odds (e.g., 1.85)
  point?: number       // For spreads/totals (e.g., -0.5, 2.5)
}

export interface OddsMarket {
  id: string
  fixture_id: string
  bookmaker: string
  bet_type: string     // "h2h", "spreads", "totals"
  values: OddsOutcome[]
  updated_at: string
}

// Best odds across all bookmakers
export interface BestOdds {
  home: { price: number; bookmaker: string }
  draw: { price: number; bookmaker: string }
  away: { price: number; bookmaker: string }
}

// Extended fixture with odds
export interface FixtureWithOdds extends FixtureWithTeams {
  odds?: OddsMarket[]
}

// Update System Types
export type DataCategory =
  | 'fixtures'
  | 'standings'
  | 'injuries'
  | 'odds'
  | 'weather'
  | 'predictions'
  | 'team-stats'
  | 'player-stats'
  | 'lineups'
  | 'match-analysis'
  | 'top-performers'
  | 'leagues'

export interface RefreshEvent {
  id: string
  category: DataCategory
  type: 'refresh' | 'prediction' | 'analysis'
  status: 'success' | 'error' | 'info' | 'warning'
  message: string
  details?: {
    inserted?: number
    updated?: number
    errors?: number
    duration?: number
    league?: string  // League name that was refreshed
    rawResponse?: Record<string, any>  // Full API response for collapsible display
  }
  timestamp: string
}

export interface UpdateState {
  lastRefreshTimes: Partial<Record<DataCategory, string>>
  isRefreshing: Partial<Record<DataCategory, boolean>>
  refreshHistory: RefreshEvent[]
}

export interface UpdateContextValue extends UpdateState {
  refreshCategory: (category: DataCategory, leagueId?: string, leagueName?: string) => Promise<void>
  addRefreshEvent: (event: Omit<RefreshEvent, 'id' | 'timestamp'>) => void
  updateLastRefreshTime: (category: DataCategory, time: string) => void
  setRefreshing: (category: DataCategory, isRefreshing: boolean) => void
  clearHistory: () => void
  stopAllRefreshes: () => void
}
