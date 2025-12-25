#!/bin/bash
# =============================================================================
# SUPABASE CURL COMMANDS FOR FOOTBALL PREDICTION
# =============================================================================
# Usage: Set the variables below, then run individual curl commands
# Or source this file and call functions: source supabase-curls.sh
# =============================================================================

# ----- CONFIGURATION -----
export SUPABASE_URL="https://ypddcrvjeeqavqpcypoa.supabase.co"
export SUPABASE_KEY="YOUR_SERVICE_ROLE_KEY"  # Replace with actual key from .env.local

# ----- MATCH VARIABLES (set these before running) -----
export FIXTURE_ID="uuid-here"
export HOME_TEAM_ID="uuid-here"
export AWAY_TEAM_ID="uuid-here"
export VENUE_ID="uuid-here"
export REFEREE_NAME="referee-name-here"
export SEASON=2025

# =============================================================================
# 1. FIXTURE DETAILS (with teams and venue joins)
# =============================================================================
# Returns: fixture info, home/away team details, venue details
curl_fixture() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixtures?id=eq.$FIXTURE_ID&select=*,home_team:teams!fixtures_home_team_id_fkey(id,name,logo,venue_id),away_team:teams!fixtures_away_team_id_fkey(id,name,logo,venue_id),venue:venues(name,city,capacity,surface,lat,lng)" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 2. TEAM SEASON STATS (Factor A: Base Strength)
# =============================================================================
# Returns: goals_for_avg, goals_against_avg, clean_sheets, form, penalties, home/away stats
curl_home_team_stats() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/team_season_stats?team_id=eq.$HOME_TEAM_ID&season=eq.$SEASON&select=*" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

curl_away_team_stats() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/team_season_stats?team_id=eq.$AWAY_TEAM_ID&season=eq.$SEASON&select=*" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 3. STANDINGS (Factor B3, F1: Table Stakes)
# =============================================================================
# Returns: rank, points, goal_diff, form, description, home/away records
curl_standings() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/standings?or=(team_id.eq.$HOME_TEAM_ID,team_id.eq.$AWAY_TEAM_ID)&season=eq.$SEASON&select=*" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 4. RECENT FORM - Last 10 Matches (Factor B1, B2, B4)
# =============================================================================
curl_home_recent_form() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixtures?or=(home_team_id.eq.$HOME_TEAM_ID,away_team_id.eq.$HOME_TEAM_ID)&status=eq.FT&order=match_date.desc&limit=10&select=id,match_date,home_team_id,away_team_id,goals_home,goals_away,round" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

curl_away_recent_form() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixtures?or=(home_team_id.eq.$AWAY_TEAM_ID,away_team_id.eq.$AWAY_TEAM_ID)&status=eq.FT&order=match_date.desc&limit=10&select=id,match_date,home_team_id,away_team_id,goals_home,goals_away,round" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 5. FIXTURE STATISTICS - xG & Tactical (Factor A1, A5, E1-E4)
# =============================================================================
# Returns: expected_goals, shots, possession, passes, corners, offsides, fouls
curl_home_fixture_stats() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixture_statistics?team_id=eq.$HOME_TEAM_ID&select=fixture_id,expected_goals,shots_total,shots_on_goal,ball_possession,passes_total,passes_accurate,passes_pct,corners,offsides,fouls&order=fixture_id.desc&limit=10" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

curl_away_fixture_stats() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixture_statistics?team_id=eq.$AWAY_TEAM_ID&select=fixture_id,expected_goals,shots_total,shots_on_goal,ball_possession,passes_total,passes_accurate,passes_pct,corners,offsides,fouls&order=fixture_id.desc&limit=10" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 6. INJURIES (Factor C1, C2)
# =============================================================================
# Returns: player_name, type, reason, reported_date
curl_injuries() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/injuries?or=(team_id.eq.$HOME_TEAM_ID,team_id.eq.$AWAY_TEAM_ID)&select=team_id,player_name,type,reason,reported_date" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 7. LINEUPS - Formation & XI Cohesion (Factor C3, C4, C5, E1)
# =============================================================================
# Returns: formation, starting_xi, substitutes, coach_name
curl_lineups() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/lineups?or=(team_id.eq.$HOME_TEAM_ID,team_id.eq.$AWAY_TEAM_ID)&order=fixture_id.desc&limit=10&select=team_id,fixture_id,formation,starting_xi,substitutes,coach_name" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 8. HEAD-TO-HEAD (Factor I1, I2)
# =============================================================================
# Returns: matches_played, wins, draws, goals, last_fixtures, fixture_data
curl_h2h() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/head_to_head?or=(and(team1_id.eq.$HOME_TEAM_ID,team2_id.eq.$AWAY_TEAM_ID),and(team1_id.eq.$AWAY_TEAM_ID,team2_id.eq.$HOME_TEAM_ID))&select=*" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 9. REFEREE STATS (Factor G1, G2)
# =============================================================================
# Returns: avg_yellow_cards, avg_red_cards, penalties_per_match, home/away win %
curl_referee() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/referee_stats?name=eq.$REFEREE_NAME&select=*" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 10. WEATHER (Factor H4, H5)
# =============================================================================
# Returns: temperature, feels_like, wind_speed, precipitation, humidity, description
curl_weather() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/weather?fixture_id=eq.$FIXTURE_ID&select=*" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 11. ODDS (Value Bet Detection)
# =============================================================================
# Returns: bookmaker, bet_type (h2h/spreads/totals), values
curl_odds() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/odds?fixture_id=eq.$FIXTURE_ID&select=bookmaker,bet_type,values" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 12. VENUE DETAILS (Factor H1, H2, H3)
# =============================================================================
# Returns: name, city, capacity, surface, lat, lng
curl_venue() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/venues?id=eq.$VENUE_ID&select=*" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 13. PLAYER STATS - Key Players (Factor C6, C7)
# =============================================================================
# Returns: position, rating, goals, assists, yellow/red cards, penalties
curl_home_players() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/player_season_stats?team_id=eq.$HOME_TEAM_ID&season=eq.$SEASON&order=rating.desc&limit=15&select=player_id,position,appearances,minutes,rating,goals,assists,yellow_cards,red_cards,penalties_scored" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

curl_away_players() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/player_season_stats?team_id=eq.$AWAY_TEAM_ID&season=eq.$SEASON&order=rating.desc&limit=15&select=player_id,position,appearances,minutes,rating,goals,assists,yellow_cards,red_cards,penalties_scored" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 14. FIXTURE EVENTS - Goals & Cards Pattern
# =============================================================================
# Returns: elapsed, type, detail, player_name (for discipline analysis)
curl_home_events() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixture_events?team_id=eq.$HOME_TEAM_ID&type=in.(Goal,Card)&order=fixture_id.desc&limit=50&select=fixture_id,elapsed,type,detail,player_name" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

curl_away_events() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixture_events?team_id=eq.$AWAY_TEAM_ID&type=in.(Goal,Card)&order=fixture_id.desc&limit=50&select=fixture_id,elapsed,type,detail,player_name" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# 15. REST DAYS CALCULATION (Factor D1, D2)
# =============================================================================
# Returns: match_date of last completed match
curl_home_last_match() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixtures?or=(home_team_id.eq.$HOME_TEAM_ID,away_team_id.eq.$HOME_TEAM_ID)&status=eq.FT&order=match_date.desc&limit=1&select=match_date" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

curl_away_last_match() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixtures?or=(home_team_id.eq.$AWAY_TEAM_ID,away_team_id.eq.$AWAY_TEAM_ID)&status=eq.FT&order=match_date.desc&limit=1&select=match_date" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# Congestion - matches in last 14 days (adjust date as needed)
curl_home_congestion() {
  local date_14_days_ago=$(date -v-14d +%Y-%m-%d 2>/dev/null || date -d "14 days ago" +%Y-%m-%d)
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixtures?or=(home_team_id.eq.$HOME_TEAM_ID,away_team_id.eq.$HOME_TEAM_ID)&match_date=gte.$date_14_days_ago&status=eq.FT&select=match_date,round" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

curl_away_congestion() {
  local date_14_days_ago=$(date -v-14d +%Y-%m-%d 2>/dev/null || date -d "14 days ago" +%Y-%m-%d)
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixtures?or=(home_team_id.eq.$AWAY_TEAM_ID,away_team_id.eq.$AWAY_TEAM_ID)&match_date=gte.$date_14_days_ago&status=eq.FT&select=match_date,round" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# COMBINED ALL-IN-ONE QUERY (for efficiency)
# =============================================================================
curl_fixture_complete() {
  curl -s -X GET "$SUPABASE_URL/rest/v1/fixtures?id=eq.$FIXTURE_ID&select=*,home_team:teams!fixtures_home_team_id_fkey(*,venue:venues(*)),away_team:teams!fixtures_away_team_id_fkey(*,venue:venues(*)),venue:venues(*),weather(*),odds(*),lineups(*),fixture_statistics(*)" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json"
}

# =============================================================================
# RUN ALL ENDPOINTS (for testing)
# =============================================================================
fetch_all_data() {
  echo "=== Fetching Fixture ==="
  curl_fixture | jq .

  echo "=== Fetching Home Team Stats ==="
  curl_home_team_stats | jq .

  echo "=== Fetching Away Team Stats ==="
  curl_away_team_stats | jq .

  echo "=== Fetching Standings ==="
  curl_standings | jq .

  echo "=== Fetching Injuries ==="
  curl_injuries | jq .

  echo "=== Fetching H2H ==="
  curl_h2h | jq .

  echo "=== Fetching Referee Stats ==="
  curl_referee | jq .

  echo "=== Fetching Weather ==="
  curl_weather | jq .

  echo "=== Fetching Odds ==="
  curl_odds | jq .
}

# =============================================================================
# USAGE EXAMPLES
# =============================================================================
# 1. Source this file: source scripts/supabase-curls.sh
# 2. Set variables:
#    export FIXTURE_ID="a4eca009-cff4-4874-b1c4-142be52a4314"
#    export HOME_TEAM_ID="b42d4194-4c33-4c5e-a2a1-322c5670ea3d"
#    export AWAY_TEAM_ID="173b17b3-880e-4462-9002-8a468495047a"
# 3. Run individual function: curl_fixture | jq .
# 4. Or run all: fetch_all_data

echo "Supabase curl commands loaded. Set variables and call functions."
echo "Example: curl_fixture | jq ."
