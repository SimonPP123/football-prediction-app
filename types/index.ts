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
  created_at: string
  updated_at: string
}

export interface PredictionHistory {
  id: string
  fixture_id: string
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
  created_at: string
}

export const AI_MODELS = [
  // OpenAI (December 2025)
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI' },
  { id: 'openai/gpt-5', name: 'GPT-5', provider: 'OpenAI' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI' },
  { id: 'openai/o3', name: 'o3 (Reasoning)', provider: 'OpenAI' },
  { id: 'openai/o4-mini', name: 'o4 Mini (Fast Reasoning)', provider: 'OpenAI' },
  // Anthropic (December 2025)
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  // Google (December 2025) - Note: Gemini 3 not yet available on OpenRouter
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  // Meta (December 2025)
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta' },
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta' },
  // DeepSeek (December 2025)
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
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
