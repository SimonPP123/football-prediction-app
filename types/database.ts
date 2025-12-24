// Supabase Database types - simplified for now
export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          api_id: number
          name: string
          code: string | null
          country: string | null
          logo: string | null
          venue_id: string | null
          created_at: string
        }
      }
      fixtures: {
        Row: {
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
          score_halftime: any
          score_fulltime: any
          created_at: string
          updated_at: string
        }
      }
      standings: {
        Row: {
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
          home_record: any
          away_record: any
          updated_at: string
        }
      }
      predictions: {
        Row: {
          id: string
          fixture_id: string
          overall_index: number | null
          prediction_result: string | null
          confidence_level: string | null
          factors: any
          analysis_text: string | null
          key_factors: any
          risk_factors: any
          model_version: string
          created_at: string
          updated_at: string
        }
      }
      venues: {
        Row: {
          id: string
          api_id: number | null
          name: string
          city: string | null
          capacity: number | null
          surface: string | null
        }
      }
      players: {
        Row: {
          id: string
          api_id: number
          name: string
          firstname: string | null
          lastname: string | null
          age: number | null
          photo: string | null
          injured: boolean
        }
      }
      coaches: {
        Row: {
          id: string
          api_id: number
          name: string
          firstname: string | null
          lastname: string | null
          photo: string | null
          team_id: string | null
        }
      }
      top_performers: {
        Row: {
          id: string
          league_id: string
          season: number
          category: string
          rank: number
          player_name: string
          player_photo: string | null
          team_name: string | null
          team_logo: string | null
          value: number
          appearances: number | null
        }
      }
      team_season_stats: {
        Row: {
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
          form: string | null
        }
      }
      head_to_head: {
        Row: {
          id: string
          team1_id: string
          team2_id: string
          matches_played: number
          team1_wins: number
          team2_wins: number
          draws: number
          team1_goals: number
          team2_goals: number
          last_fixtures: any
        }
      }
    }
  }
}
