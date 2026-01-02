# Database Schema Reference

*Last Updated: January 2, 2026*

---

## Overview

The Football Prediction System uses **Supabase PostgreSQL** with 20 tables organized into 5 categories.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE ARCHITECTURE                             │
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐ │
│  │   CORE DATA (7)    │  │   MATCH DATA (4)   │  │  PREDICTIONS (2)   │ │
│  ├────────────────────┤  ├────────────────────┤  ├────────────────────┤ │
│  │ leagues            │  │ fixture_statistics │  │ predictions        │ │
│  │ venues             │  │ fixture_events     │  │ match_analysis     │ │
│  │ teams              │  │ lineups            │  │                    │ │
│  │ fixtures           │  │ head_to_head       │  │                    │ │
│  │ standings          │  │                    │  │                    │ │
│  │ team_season_stats  │  │                    │  │                    │ │
│  │ injuries           │  │                    │  │                    │ │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘ │
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────────────────────────────┐ │
│  │ EXTERNAL DATA (3)  │  │           SYSTEM TABLES (4)                │ │
│  ├────────────────────┤  ├────────────────────────────────────────────┤ │
│  │ odds               │  │ users              │ automation_logs       │ │
│  │ weather            │  │ user_activity_log  │ automation_config     │ │
│  │ referee_stats      │  │ refresh_logs       │                       │ │
│  └────────────────────┘  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `leagues` | League info | `api_id`, `name`, `is_active` |
| `venues` | Stadium data | `name`, `lat`, `lng`, `capacity` |
| `teams` | Club data | `api_id`, `name`, `venue_id` |
| `fixtures` | Match schedule | `home_team_id`, `away_team_id`, `match_date`, `status` |
| `standings` | League table | `team_id`, `rank`, `points`, `form` |
| `team_season_stats` | Season stats | `team_id`, `goals_for_avg`, `clean_sheets` |
| `injuries` | Injury list | `team_id`, `player_name`, `reason` |
| `fixture_statistics` | Per-match stats | `fixture_id`, `team_id`, `expected_goals` |
| `fixture_events` | Goals/cards | `fixture_id`, `type`, `player_name`, `elapsed` |
| `lineups` | Starting XI | `fixture_id`, `team_id`, `formation`, `starting_xi` |
| `head_to_head` | H2H history | `team1_id`, `team2_id`, `fixture_data` |
| `odds` | Betting odds | `fixture_id`, `bookmaker`, `values` |
| `weather` | Match weather | `fixture_id`, `temperature`, `precipitation` |
| `referee_stats` | Referee data | `name`, `avg_yellow_cards`, `penalties_per_match` |
| `predictions` | AI predictions | `fixture_id`, `prediction`, `factors`, `overall_index` |
| `match_analysis` | Post-match AI | `fixture_id`, `accuracy_score`, `learning_points` |
| `users` | User accounts | `username`, `password_hash`, `is_admin` |
| `user_activity_log` | Audit trail | `user_id`, `action`, `created_at` |
| `refresh_logs` | Data refresh log | `category`, `status`, `message` |
| `automation_logs` | Automation events | `trigger_type`, `status`, `webhook_status` |
| `automation_config` | Automation settings | `is_enabled`, timing settings |

---

## Table Relationships

```
leagues ◄──────────────────────────────────────────────────────────────┐
   │                                                                    │
   ├──► fixtures ◄── home_team_id ── teams ──► venue_id ──► venues     │
   │       │         away_team_id ─────┘                                │
   │       │                                                            │
   │       ├──► fixture_statistics                                      │
   │       ├──► fixture_events                                          │
   │       ├──► lineups                                                 │
   │       ├──► predictions ──► match_analysis                          │
   │       ├──► odds                                                    │
   │       └──► weather                                                 │
   │                                                                    │
   ├──► standings ◄── team_id ── teams                                  │
   │                                                                    │
   ├──► team_season_stats ◄── team_id ── teams                          │
   │                                                                    │
   └──► injuries ◄── team_id ── teams                                   │

teams ────► head_to_head (team1_id, team2_id)

refresh_logs ◄── league_id ── leagues
automation_logs ◄── league_id ── leagues

users ──► user_activity_log
```

---

## Core Data Tables

### leagues

League information (e.g., Premier League).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `api_id` | INTEGER | API-Football league ID (unique) |
| `name` | TEXT | League name |
| `country` | TEXT | Country |
| `logo` | TEXT | Logo URL |
| `current_season` | INTEGER | Current season year (2025) |
| `is_active` | BOOLEAN | Enabled for automation |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### venues

Stadium information with coordinates for weather.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `api_id` | INTEGER | API-Football venue ID |
| `name` | TEXT | Stadium name |
| `city` | TEXT | City |
| `country` | TEXT | Country |
| `capacity` | INTEGER | Seating capacity |
| `surface` | TEXT | Pitch surface (grass, artificial) |
| `lat` | DECIMAL(10,6) | Latitude for weather API |
| `lng` | DECIMAL(10,6) | Longitude for weather API |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### teams

Club information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `api_id` | INTEGER | API-Football team ID (unique) |
| `name` | TEXT | Team name |
| `code` | TEXT | Team code (e.g., "LIV") |
| `country` | TEXT | Country |
| `logo` | TEXT | Logo URL |
| `venue_id` | UUID | Foreign key to venues |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### fixtures

Match schedule and results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `api_id` | INTEGER | API-Football fixture ID (unique) |
| `league_id` | UUID | Foreign key to leagues |
| `season` | INTEGER | Season year |
| `round` | TEXT | Match round (e.g., "Regular Season - 22") |
| `home_team_id` | UUID | Foreign key to teams |
| `away_team_id` | UUID | Foreign key to teams |
| `match_date` | TIMESTAMPTZ | Kickoff time |
| `venue_id` | UUID | Foreign key to venues |
| `referee` | TEXT | Referee name |
| `status` | TEXT | Match status (see below) |
| `goals_home` | INTEGER | Home team goals |
| `goals_away` | INTEGER | Away team goals |
| `score_halftime` | JSONB | HT score {home, away} |
| `score_fulltime` | JSONB | FT score {home, away} |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

**Status Values:**
| Status | Meaning |
|--------|---------|
| `NS` | Not Started |
| `1H` | First Half |
| `HT` | Half Time |
| `2H` | Second Half |
| `ET` | Extra Time |
| `BT` | Break Time |
| `P` | Penalties |
| `FT` | Full Time |
| `AET` | After Extra Time |
| `PEN` | After Penalties |
| `PST` | Postponed |
| `CANC` | Cancelled |

---

### standings

Current league table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `league_id` | UUID | Foreign key to leagues |
| `season` | INTEGER | Season year |
| `team_id` | UUID | Foreign key to teams |
| `rank` | INTEGER | Table position |
| `points` | INTEGER | Total points |
| `goal_diff` | INTEGER | Goal difference |
| `form` | TEXT | Last 5 results (e.g., "WDWWL") |
| `description` | TEXT | Position description (e.g., "Champions League") |
| `played` | INTEGER | Matches played |
| `won` | INTEGER | Wins |
| `drawn` | INTEGER | Draws |
| `lost` | INTEGER | Losses |
| `goals_for` | INTEGER | Goals scored |
| `goals_against` | INTEGER | Goals conceded |
| `home_record` | JSONB | Home record {played, won, drawn, lost} |
| `away_record` | JSONB | Away record |
| `updated_at` | TIMESTAMPTZ | Last update |

**Unique Constraint:** `(league_id, season, team_id)`

---

### team_season_stats

Aggregated season statistics per team.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team_id` | UUID | Foreign key to teams |
| `league_id` | UUID | Foreign key to leagues |
| `season` | INTEGER | Season year |
| `fixtures_played` | INTEGER | Matches played |
| `wins` | INTEGER | Wins |
| `draws` | INTEGER | Draws |
| `losses` | INTEGER | Losses |
| `goals_for` | INTEGER | Goals scored |
| `goals_against` | INTEGER | Goals conceded |
| `goals_for_avg` | DECIMAL(4,2) | Goals scored per game |
| `goals_against_avg` | DECIMAL(4,2) | Goals conceded per game |
| `clean_sheets` | INTEGER | Clean sheets |
| `failed_to_score` | INTEGER | Games without scoring |
| `penalties_scored` | INTEGER | Penalties scored |
| `penalties_missed` | INTEGER | Penalties missed |
| `form` | TEXT | Recent form string |
| `home_stats` | JSONB | Home performance stats |
| `away_stats` | JSONB | Away performance stats |
| `goals_by_minute` | JSONB | Goals by time period |
| `cards_by_minute` | JSONB | Cards by time period |
| `updated_at` | TIMESTAMPTZ | Last update |

**Unique Constraint:** `(team_id, league_id, season)`

---

### injuries

Current injury list per team.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team_id` | UUID | Foreign key to teams |
| `player_name` | TEXT | Player name |
| `player_id` | INTEGER | API-Football player ID |
| `type` | TEXT | Injury type (e.g., "Muscle") |
| `reason` | TEXT | Injury description |
| `fixture_id` | UUID | Match where injured (optional) |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

## Match Data Tables

### fixture_statistics

Per-match statistics for each team.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fixture_id` | UUID | Foreign key to fixtures |
| `team_id` | UUID | Foreign key to teams |
| `shots_total` | INTEGER | Total shots |
| `shots_on_goal` | INTEGER | Shots on target |
| `shots_off_goal` | INTEGER | Shots off target |
| `shots_blocked` | INTEGER | Blocked shots |
| `shots_inside_box` | INTEGER | Shots inside box |
| `shots_outside_box` | INTEGER | Shots outside box |
| `corners` | INTEGER | Corner kicks |
| `offsides` | INTEGER | Offside calls |
| `fouls` | INTEGER | Fouls committed |
| `ball_possession` | DECIMAL(5,2) | Possession % |
| `yellow_cards` | INTEGER | Yellow cards |
| `red_cards` | INTEGER | Red cards |
| `goalkeeper_saves` | INTEGER | GK saves |
| `passes_total` | INTEGER | Total passes |
| `passes_accurate` | INTEGER | Accurate passes |
| `passes_pct` | DECIMAL(5,2) | Pass accuracy % |
| `expected_goals` | DECIMAL(4,2) | xG value |
| `created_at` | TIMESTAMPTZ | Created timestamp |

**Unique Constraint:** `(fixture_id, team_id)`

---

### fixture_events

Match events (goals, cards, substitutions).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fixture_id` | UUID | Foreign key to fixtures |
| `team_id` | UUID | Foreign key to teams |
| `elapsed` | INTEGER | Minute of event |
| `extra_time` | INTEGER | Added time minutes |
| `type` | TEXT | Event type (Goal, Card, subst) |
| `detail` | TEXT | Event detail (Normal Goal, Yellow Card) |
| `player_name` | TEXT | Player involved |
| `player_id` | INTEGER | API-Football player ID |
| `assist_name` | TEXT | Assist player name |
| `assist_id` | INTEGER | API-Football assist player ID |
| `comments` | TEXT | Additional info |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### lineups

Match lineups and formations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fixture_id` | UUID | Foreign key to fixtures |
| `team_id` | UUID | Foreign key to teams |
| `formation` | TEXT | Formation (e.g., "4-3-3") |
| `starting_xi` | JSONB | Array of starting players |
| `substitutes` | JSONB | Array of substitutes |
| `coach_name` | TEXT | Manager name |
| `coach_id` | INTEGER | API-Football coach ID |
| `created_at` | TIMESTAMPTZ | Created timestamp |

**Unique Constraint:** `(fixture_id, team_id)`

**Note:** Lineups are only available ~1 hour before kickoff.

---

### head_to_head

Historical head-to-head data between teams.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team1_id` | UUID | Foreign key to teams |
| `team2_id` | UUID | Foreign key to teams |
| `fixture_data` | JSONB | Array of past match results |
| `updated_at` | TIMESTAMPTZ | Last update |

**Unique Constraint:** `(team1_id, team2_id)`

---

## External Data Tables

### odds

Betting odds from The Odds API.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fixture_id` | UUID | Foreign key to fixtures |
| `bookmaker` | TEXT | Bookmaker name |
| `bet_type` | TEXT | Bet type (h2h, spreads, totals) |
| `values` | JSONB | Odds values |
| `updated_at` | TIMESTAMPTZ | Last update |

**Unique Constraint:** `(fixture_id, bookmaker, bet_type)`

---

### weather

Match weather conditions from Open-Meteo.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fixture_id` | UUID | Foreign key to fixtures (unique) |
| `temperature` | DECIMAL(4,1) | Temperature in Celsius |
| `feels_like` | DECIMAL(4,1) | Feels-like temperature |
| `wind_speed` | DECIMAL(5,2) | Wind speed in km/h |
| `wind_direction` | INTEGER | Wind direction in degrees |
| `precipitation` | DECIMAL(5,2) | Precipitation in mm |
| `humidity` | INTEGER | Humidity percentage |
| `weather_code` | INTEGER | WMO weather code |
| `description` | TEXT | Weather description |
| `fetched_at` | TIMESTAMPTZ | When data was fetched |

---

### referee_stats

Referee tendencies and statistics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Referee name (unique) |
| `matches_refereed` | INTEGER | Total matches |
| `avg_yellow_cards` | DECIMAL(4,2) | Yellow cards per game |
| `avg_red_cards` | DECIMAL(4,2) | Red cards per game |
| `avg_fouls` | DECIMAL(5,2) | Fouls per game |
| `penalties_per_match` | DECIMAL(4,3) | Penalties per game |
| `home_win_pct` | DECIMAL(5,2) | Home win percentage |
| `away_win_pct` | DECIMAL(5,2) | Away win percentage |
| `draw_pct` | DECIMAL(5,2) | Draw percentage |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Prediction Tables

### predictions

AI-generated match predictions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fixture_id` | UUID | Foreign key to fixtures (unique) |
| `overall_index` | INTEGER | 1-100 score (>50 = home, <50 = away) |
| `prediction_result` | TEXT | "1", "X", "2", "1X", "X2", "12" |
| `confidence_level` | TEXT | "high", "medium", "low" |
| `factors` | JSONB | 6-factor analysis (A-F) |
| `analysis_text` | TEXT | AI narrative analysis |
| `key_factors` | JSONB | Array of key factors |
| `risk_factors` | JSONB | Array of risk factors |
| `model_version` | TEXT | AI model used |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

---

### match_analysis

Post-match AI analysis comparing predictions to results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fixture_id` | UUID | Foreign key to fixtures (unique) |
| `home_team_id` | UUID | Foreign key to teams |
| `away_team_id` | UUID | Foreign key to teams |
| `predicted_result` | VARCHAR(5) | Predicted "1", "X", "2" |
| `actual_result` | VARCHAR(5) | Actual "1", "X", "2" |
| `prediction_correct` | BOOLEAN | Was prediction correct? |
| `predicted_score` | VARCHAR(10) | Predicted score (e.g., "2-1") |
| `actual_score` | VARCHAR(10) | Actual score |
| `score_correct` | BOOLEAN | Was score correct? |
| `predicted_over_under` | VARCHAR(10) | "Over" or "Under" 2.5 |
| `actual_over_under` | VARCHAR(10) | Actual over/under |
| `over_under_correct` | BOOLEAN | Was O/U correct? |
| `predicted_btts` | VARCHAR(5) | "Yes" or "No" |
| `actual_btts` | VARCHAR(5) | Actual BTTS |
| `btts_correct` | BOOLEAN | Was BTTS correct? |
| `overall_index` | INTEGER | From original prediction |
| `confidence_pct` | INTEGER | From original prediction |
| `accuracy_score` | DECIMAL(5,2) | Overall accuracy 0-100 |
| `factors` | JSONB | Original prediction factors |
| `factor_accuracy` | JSONB | Which factors were accurate |
| `home_team_performance` | JSONB | Actual home team stats |
| `away_team_performance` | JSONB | Actual away team stats |
| `post_match_analysis` | TEXT | AI-generated analysis |
| `key_insights` | JSONB | Array of insights |
| `learning_points` | JSONB | Lessons for future |
| `surprises` | JSONB | Unexpected outcomes |
| `model_version` | VARCHAR(100) | AI model used |
| `analysis_type` | VARCHAR(50) | "post_match" |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## System Tables

### users

User accounts for authentication.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `username` | TEXT | Unique username |
| `password_hash` | TEXT | Bcrypt hash (cost 10) |
| `is_admin` | BOOLEAN | Admin privileges |
| `is_active` | BOOLEAN | Can login |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |
| `last_login` | TIMESTAMPTZ | Last login time |
| `created_by` | UUID | Admin who created |

---

### user_activity_log

Audit trail for user actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `action` | TEXT | Action type |
| `details` | JSONB | Action details |
| `ip_address` | TEXT | Client IP |
| `created_at` | TIMESTAMPTZ | Timestamp |

**Action Types:** `login`, `logout`, `create_user`, `update_user`, `delete_user`

---

### refresh_logs

Data refresh operation history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `category` | TEXT | Refresh category |
| `type` | TEXT | "refresh" |
| `status` | TEXT | "success", "error", "pending" |
| `message` | TEXT | Result message |
| `details` | JSONB | Additional details |
| `league_id` | UUID | Foreign key to leagues |
| `created_at` | TIMESTAMPTZ | Timestamp |

**Auto-cleanup:** Logs older than 30 days are automatically deleted.

---

### automation_logs

Automation trigger events and webhook responses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `trigger_type` | TEXT | "pre-match", "prediction", "live", "post-match", "analysis" |
| `cron_run_id` | UUID | Groups triggers from same cron run |
| `league_id` | UUID | Foreign key to leagues |
| `fixture_ids` | UUID[] | Array of fixture IDs |
| `fixture_count` | INTEGER | Number of fixtures |
| `webhook_url` | TEXT | n8n webhook URL called |
| `webhook_status` | INTEGER | HTTP status code |
| `webhook_response` | JSONB | Full response |
| `webhook_duration_ms` | INTEGER | Request duration |
| `status` | TEXT | "success", "error", "skipped", "no-action" |
| `message` | TEXT | Result message |
| `error_message` | TEXT | Error details |
| `triggered_at` | TIMESTAMPTZ | When triggered |
| `completed_at` | TIMESTAMPTZ | When completed |
| `details` | JSONB | Additional context |

---

### automation_config

Automation system configuration (singleton).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `is_enabled` | BOOLEAN | Master switch |
| `last_cron_run` | TIMESTAMPTZ | Last cron execution |
| `last_cron_status` | TEXT | "success", "error", "running" |
| `pre_match_enabled` | BOOLEAN | Enable pre-match trigger |
| `prediction_enabled` | BOOLEAN | Enable prediction trigger |
| `live_enabled` | BOOLEAN | Enable live trigger |
| `post_match_enabled` | BOOLEAN | Enable post-match trigger |
| `analysis_enabled` | BOOLEAN | Enable analysis trigger |
| `pre_match_minutes_before` | INTEGER | Minutes before kickoff (30) |
| `prediction_minutes_before` | INTEGER | Minutes before kickoff (25) |
| `post_match_hours_after` | NUMERIC | Hours after FT (6) |
| `analysis_hours_after` | NUMERIC | Hours after FT (6.25) |
| `webhook_timeout_ms` | INTEGER | Webhook timeout (60000) |
| `retry_on_failure` | BOOLEAN | Retry failed webhooks |
| `max_retries` | INTEGER | Max retry attempts (3) |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Performance Indexes

Key indexes for query performance:

```sql
-- Fixtures
CREATE INDEX idx_fixtures_date ON fixtures(match_date);
CREATE INDEX idx_fixtures_teams ON fixtures(home_team_id, away_team_id);
CREATE INDEX idx_fixtures_status ON fixtures(status);
CREATE INDEX idx_fixtures_season ON fixtures(season);

-- Standings
CREATE INDEX idx_standings_season ON standings(league_id, season);

-- Predictions
CREATE INDEX idx_predictions_fixture ON predictions(fixture_id);

-- Match Analysis
CREATE INDEX idx_match_analysis_fixture ON match_analysis(fixture_id);
CREATE INDEX idx_match_analysis_created ON match_analysis(created_at DESC);
CREATE INDEX idx_match_analysis_accuracy ON match_analysis(prediction_correct);

-- Statistics
CREATE INDEX idx_fixture_stats_fixture ON fixture_statistics(fixture_id);
CREATE INDEX idx_injuries_team ON injuries(team_id);
CREATE INDEX idx_events_fixture ON fixture_events(fixture_id);
CREATE INDEX idx_lineups_fixture ON lineups(fixture_id);

-- Logs
CREATE INDEX idx_refresh_logs_created_at ON refresh_logs(created_at DESC);
CREATE INDEX idx_automation_logs_triggered_at ON automation_logs(triggered_at DESC);
CREATE INDEX idx_automation_logs_trigger_type ON automation_logs(trigger_type);
```

---

## Row Level Security

All tables have RLS enabled with these policies:

- **Public Read Access**: Most data tables allow SELECT for any authenticated user
- **Service Role Full Access**: Service role can INSERT/UPDATE/DELETE
- **Sensitive Tables**: `users` and `user_activity_log` only accessible by service role

---

## Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Core tables (leagues, teams, fixtures, etc.) |
| `002_extended_schema.sql` | Additional fields and constraints |
| `003_prediction_enhancements.sql` | Prediction table improvements |
| `004_match_analysis.sql` | Post-match analysis table |
| `005_certainty_score.sql` | Certainty score field |
| `006_prediction_system_fixes.sql` | Bug fixes |
| `007_user_management.sql` | Users and activity log |
| `008_multi_league.sql` | Multi-league support |
| `009_league_id_match_analysis.sql` | League ID on analysis |
| `010_performance_indexes.sql` | Performance indexes |
| `011_refresh_logs.sql` | Refresh logging |
| `012_automation_tables.sql` | Automation system |

---

## Related Documentation

- [AUTOMATION.md](./AUTOMATION.md) - Automation system details
- [OWNER_GUIDE.md](./OWNER_GUIDE.md) - System overview
- [API_REFERENCE.md](./API_REFERENCE.md) - API endpoints
