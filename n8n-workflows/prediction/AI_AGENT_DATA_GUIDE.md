# AI Agent Data Guide

This document explains in detail what data is sent to the AI Agent for football match prediction analysis.

---

## Overview

The AI Agent receives data from **6 main sections**:

1. **Match Details** - Basic fixture information from webhook
2. **Database Sources** - Aggregated Supabase queries (JSON arrays)
3. **Live Team News** - Real-time research from AI sub-agents
4. **Historical Learnings** - Past prediction analyses for learning
5. **Factor Analysis** - The weighted 6-factor scoring system prompt
6. **Output Format** - Required JSON response structure

---

## Section 1: Match Details

**Source**: Webhook payload from Next.js API

```
===============================================================================
MATCH DETAILS
===============================================================================
- **Home Team**: Burnley
- **Away Team**: Newcastle
- **Venue**: Turf Moor
- **Round**: Regular Season - 19
- **Model**: openai/gpt-5-mini
```

### Fields Explained

| Field | Source | Example |
|-------|--------|---------|
| `home_team` | `webhook.body.home_team` | "Burnley" |
| `away_team` | `webhook.body.away_team` | "Newcastle" |
| `venue` | `webhook.body.venue` | "Turf Moor" |
| `round` | `webhook.body.round` | "Regular Season - 19" |
| `model` | `webhook.body.model` | "openai/gpt-5-mini" |

---

## Section 2: Database Sources

**Source**: Two aggregated JSON arrays from Supabase HTTP requests

The data comes from two Aggregate nodes that combine multiple parallel queries:

### Aggregate 1 (First Batch) - `$json.data`

Contains 9 data sources merged together:

| Query Node | Data Type | What It Contains |
|------------|-----------|------------------|
| Head to Head | `head_to_head` | H2H record between the two teams |
| Odds and Other Info | `fixtures` | Full fixture data with nested relations |
| Fixture Statistics Away | `fixture_statistics` | Away team's last 10 match stats |
| Fixture Statistics Home | `fixture_statistics` | Home team's last 10 match stats |
| Recent Form Away | `fixtures` | Away team's last 10 completed matches |
| Recent Form Home | `fixtures` | Home team's last 10 completed matches |
| Fetch Home Team Stats | `team_season_stats` | Home team season aggregates |
| Fetch Away Team Stats | `team_season_stats` | Away team season aggregates |
| Fetch Standings | `standings` | Both teams' league table positions |

### Aggregate 2 (Second Batch) - `$('Aggregate').item.json.data`

Contains 8 additional data sources:

| Query Node | Data Type | What It Contains |
|------------|-----------|------------------|
| Player Match Stats Home | `player_match_stats` | Last 50 player performances (home team) |
| Player Match Stats Away | `player_match_stats` | Last 50 player performances (away team) |
| Player Season Stats Home | `player_season_stats` | Top 15 players by rating (home team) |
| Player Season Stats Away | `player_season_stats` | Top 15 players by rating (away team) |
| Fixture Events Home | `fixture_events` | Last 100 goals/cards (home team) |
| Fixture Events Away | `fixture_events` | Last 100 goals/cards (away team) |
| AI Agent1 Output | Text | Live news research for home team |
| AI Agent2 Output | Text | Live news research for away team |

---

## Detailed Data Structures

### Head-to-Head Data

```json
{
  "id": "86137d41-4b17-48d1-a2ff-9317709a36e5",
  "team1_id": "b909edc0-2588-4c72-96cc-ad4305c77705",
  "team2_id": "6f32e303-e2c2-4150-964b-aa0cc57e76cc",
  "matches_played": 10,
  "team1_wins": 7,
  "team2_wins": 1,
  "draws": 2,
  "team1_goals": 16,
  "team2_goals": 6,
  "fixture_data": [
    {
      "date": "2025-12-06T15:00:00+00:00",
      "winner": "home",
      "awayTeam": "Burnley",
      "homeTeam": "Newcastle",
      "awayGoals": 1,
      "homeGoals": 2
    }
    // ... last 10 H2H fixtures
  ]
}
```

**Used For**: Factor F (H2H Analysis) - 10% weight

---

### Fixture Statistics

```json
{
  "fixture_id": "ef391165-3d22-426e-9703-b653cde8ed39",
  "expected_goals": 1.45,
  "shots_total": 16,
  "shots_on_goal": 3,
  "ball_possession": 54,
  "passes_total": 491,
  "passes_accurate": 419,
  "passes_pct": 85,
  "corners": 4,
  "offsides": 1,
  "fouls": 9
}
```

**Used For**:
- Factor A (Base Strength) - xG analysis, 24% weight
- Factor B (Form) - xG trends, 22% weight
- Factor D (Tactical) - pressing indicators, 20% weight

---

### Team Season Stats

```json
{
  "id": "77d38363-b766-499b-a483-d7ceeaf6d30d",
  "team_id": "6f32e303-e2c2-4150-964b-aa0cc57e76cc",
  "season": 2025,
  "fixtures_played": 18,
  "wins": 3,
  "draws": 3,
  "losses": 12,
  "goals_for": 19,
  "goals_against": 34,
  "goals_for_avg": 1.1,
  "goals_against_avg": 1.9,
  "clean_sheets": 3,
  "failed_to_score": 6,
  "penalties_scored": 2,
  "penalties_missed": 0,
  "form": "LWLLDLLWWLLLLLLLDD",
  "home_stats": {
    "wins": 2,
    "draws": 2,
    "losses": 5,
    "played": 9,
    "goals_for": 7,
    "goals_against": 10
  },
  "away_stats": {
    "wins": 1,
    "draws": 1,
    "losses": 7,
    "played": 9,
    "goals_for": 12,
    "goals_against": 24
  },
  "goals_by_minute": {
    "0-15": {"total": 2, "percentage": "9.09%"},
    "16-30": {"total": 5, "percentage": "22.73%"},
    // ... other periods
  },
  "cards_by_minute": {
    "red": { /* by period */ },
    "yellow": { /* by period */ }
  }
}
```

**Used For**:
- Factor A2 (Home Advantage) - home/away splits
- Factor A3 (Defensive Stability) - clean sheets, goals against
- Factor A4 (Offensive Production) - goals for, failed to score

---

### Standings Data

```json
{
  "id": "2e5f2f35-c6da-41da-98e7-4c123c678fff",
  "league_id": "ca102155-a1c3-417d-ba72-0bb8fccf8275",
  "season": 2025,
  "team_id": "6f32e303-e2c2-4150-964b-aa0cc57e76cc",
  "rank": 19,
  "points": 12,
  "goal_diff": -15,
  "form": "DDLLL",
  "description": "Relegation - Championship",
  "played": 18,
  "won": 3,
  "drawn": 3,
  "lost": 12,
  "goals_for": 19,
  "goals_against": 34,
  "home_record": {
    "win": 2,
    "draw": 2,
    "lose": 5,
    "goals": {"for": 7, "against": 10},
    "played": 9
  },
  "away_record": {
    "win": 1,
    "draw": 1,
    "lose": 7,
    "goals": {"for": 12, "against": 24},
    "played": 9
  }
}
```

**Used For**: Factor E (Table Position & Context) - 13% weight

---

### Recent Fixtures (Form Data)

```json
{
  "id": "4f8d9e2d-ff66-4bb7-8593-900766f83ee2",
  "match_date": "2025-12-26T20:00:00+00:00",
  "home_team_id": "99f890dc-f548-42d2-b3b3-219f2526f8b4",
  "away_team_id": "b909edc0-2588-4c72-96cc-ad4305c77705",
  "goals_home": 1,
  "goals_away": 0,
  "round": "Regular Season - 18"
}
```

**Used For**: Factor B (Recent Form) - W/D/L trends, 22% weight

---

### Player Match Stats

```json
{
  "id": "993f8c77-a46c-4cdc-963d-ca316b98e481",
  "fixture_id": "e4907cad-8fe2-4164-bd53-4c637a3ee7ca",
  "player_id": "00c4d196-f2af-404f-aa47-5101d21258b7",
  "team_id": "6f32e303-e2c2-4150-964b-aa0cc57e76cc",
  "minutes": 90,
  "number": 1,
  "position": "G",
  "rating": 7.2,
  "captain": false,
  "substitute": false,
  "goals": 0,
  "assists": 0,
  "saves": 7,
  "shots_total": 0,
  "shots_on": 0,
  "passes_total": 21,
  "passes_key": 0,
  "passes_accuracy": 9,
  "tackles": 0,
  "blocks": 0,
  "interceptions": 0,
  "duels_total": 0,
  "duels_won": 0,
  "dribbles_attempts": 0,
  "dribbles_success": 0,
  "fouls_drawn": 0,
  "fouls_committed": 0,
  "yellow_cards": 0,
  "red_cards": 0,
  "penalties_won": 0,
  "penalties_scored": 0,
  "penalties_missed": 0,
  "penalties_saved": 0
}
```

**Used For**: Factor C (Key Players) - individual player performance, 11% weight

---

### Player Season Stats

```json
{
  "player_id": "dd59482d-827b-42dd-8ce4-409972a5300b",
  "position": "Midfielder",
  "appearances": 17,
  "minutes": 1479,
  "rating": 7.35,
  "goals": 5,
  "assists": 2,
  "yellow_cards": 4,
  "red_cards": 0,
  "penalties_scored": 0
}
```

**Used For**:
- Factor C1 (Penalty Reliability)
- Factor C2 (Top Performers Form)

---

### Fixture Events

```json
{
  "fixture_id": "e4907cad-8fe2-4164-bd53-4c637a3ee7ca",
  "elapsed": 20,
  "type": "Goal",
  "detail": "Normal Goal",
  "player_name": "J. Anthony"
}
```

**Used For**: Goal-scoring patterns, key player contributions

---

### Odds Data (Nested in Fixture)

```json
{
  "id": "f520903e-8f88-444e-8963-0b9de7515291",
  "fixture_id": "bf1413cc-7522-446b-8aff-5f497615cfc9",
  "bookmaker": "Unibet (UK)",
  "bet_type": "h2h",
  "values": [
    {"name": "Burnley", "price": 5.5},
    {"name": "Newcastle United", "price": 1.6},
    {"name": "Draw", "price": 4.2}
  ]
}
```

**Used For**: Value bet analysis, implied probabilities

---

## Section 3: Live Team News

**Source**: Two AI sub-agents (AI Agent1 and AI Agent2) that perform web searches

Each sub-agent researches one team and returns comprehensive news covering:

- Latest Match Results (last 5-10 games)
- Underlying Performance Metrics (xG, shots, PPDA)
- Home vs Away Split
- Game-State Performance
- Dropped Points From Winning Positions
- Clean Sheet / Defensive Run Tracking
- Set-Piece Analysis
- Key Tactical Shapes Used
- In-Game Management
- Pressing & Build-up Effectiveness
- Chance Creation Sources
- Finishing & Conversion
- Goalkeeper Form
- Defensive Pairings & Chemistry
- **Injury List** (critical for Factor C)
- Impact of Injuries
- Suspensions & Discipline
- Player Workload & Fatigue
- Squad Depth by Position
- Standout Performers
- Transfer Rumours
- Manager Quotes & Messaging
- Fan Sentiment & Media Narrative
- Fixture List & Congestion
- Season Targets & Table Context

**Used For**:
- Factor C3 (Injury Impact)
- Factor E2 (Club Context & Morale)
- General contextual understanding

---

## Section 4: Historical Learnings

**Source**: `match_analysis` table via webhook payload (`memory_context`)

```json
{
  "learning_points": [
    "Increase weight on short-term indicators within 48 hours of kick-off",
    "Improve modeling of finishing variance",
    "Raise the influence of immediate motivation/context"
  ],
  "key_insights": [
    "Burnley's motivation produced a clear xG advantage",
    "Finishing variance was decisive"
  ],
  "surprises": [
    "Burnley generated the higher xG despite being underdog",
    "Extremely poor finishing from Burnley"
  ],
  "factor_accuracy": {
    "F_h2h": {"notes": "H2H advantage failed to continue", "accurate": false},
    "B_form": {"notes": "Form indicators pointed wrong", "accurate": false},
    "D_tactical": {"notes": "Pressing prediction wrong", "accurate": false},
    "C_key_players": {"notes": "Absences impact underestimated", "accurate": false},
    "A_base_strength": {"notes": "Strength didn't materialise", "accurate": false},
    "E_table_position": {"notes": "Relegation pressure worked", "accurate": true}
  },
  "accuracy_score": 18,
  "predicted_result": "2",
  "actual_result": "X",
  "prediction_correct": false,
  "home_team_performance": {
    "xg": 1.65,
    "shots": 16,
    "possession": 55,
    "shots_on_target": 0
  },
  "away_team_performance": {
    "xg": 0.88,
    "shots": 15,
    "possession": 45,
    "shots_on_target": 6
  }
}
```

**Used For**: Adjusting factor weights and confidence based on past prediction accuracy for these teams

---

## Section 5: Factor Analysis System

The AI uses a **6-factor weighted system** totaling 100%:

| Factor | Weight | Sub-factors |
|--------|--------|-------------|
| **A: Base Strength** | 24% | A1: xG Balance (12%), A2: Home Advantage (4%), A3: Defensive Stability (3%), A4: Offensive Production (2%), A5: xG Luck (1%) |
| **B: Recent Form** | 22% | B1: xG Form Trend (12%), B2: Results W/D/L (4%), B3: Opponent Quality (2%), B4: Consistency (2%) |
| **C: Key Players** | 11% | C1: Penalty Reliability (4%), C2: Top Performers Form (3%), C3: Injury Impact (3%) |
| **D: Tactical Matchup** | 20% | D1: Press vs Build-up (10%), D2: High Line vs Pace (4%), D3: Aerial/Set Pieces (4%) |
| **E: Table Position** | 13% | E1: Table Stakes (10%), E2: Club Context & Morale (2%) |
| **F: Head-to-Head** | 10% | F1: H2H Results (6%), F2: H2H Quality Patterns (4%) |

Each sub-factor is scored **1-100**:
- Score > 50 = Favors Home Team
- Score < 50 = Favors Away Team
- Score = 50 = Neutral

---

## Section 6: Output Format

The AI must return this exact JSON structure:

```json
{
  "prediction": "1" | "X" | "2" | "1X" | "X2" | "12",
  "certainty_score": 0-100,
  "confidence_pct": 0-100,
  "overall_index": 1-100,
  "home_win_pct": 0-100,
  "draw_pct": 0-100,
  "away_win_pct": 0-100,
  "factors": {
    "A_base_strength": {"score": 0-100, "weighted": 0-24, "notes": "..."},
    "B_form": {"score": 0-100, "weighted": 0-22, "notes": "..."},
    "C_key_players": {"score": 0-100, "weighted": 0-11, "notes": "..."},
    "D_tactical": {"score": 0-100, "weighted": 0-20, "notes": "..."},
    "E_table_position": {"score": 0-100, "weighted": 0-13, "notes": "..."},
    "F_h2h": {"score": 0-100, "weighted": 0-10, "notes": "..."}
  },
  "historical_adjustments": {
    "applied": true | false,
    "confidence_adjusted_by": 0,
    "reason": "...",
    "factors_adjusted": ["B_form", "D_tactical"]
  },
  "score_predictions": [
    {"score": "2-1", "probability": 18},
    {"score": "1-0", "probability": 14},
    // ... top 10 scores
  ],
  "most_likely_score": "2-1",
  "over_under_2_5": "Over" | "Under",
  "btts": "Yes" | "No",
  "value_bet": "Home Win @ 2.10 (edge: +8%)" | null,
  "key_factors": ["Factor A: ...", "Factor C: ..."],
  "risk_factors": ["Factor B: ...", "Historical: ..."],
  "analysis": "200-word analysis..."
}
```

---

## Data Flow Diagram

```
                    WEBHOOK TRIGGER
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌─────────┐     ┌─────────┐     ┌─────────┐
   │ Batch 1 │     │ Batch 1 │     │ Batch 1 │
   │ Queries │     │ Queries │     │ Queries │
   │ (9 HTTP)│     │ (cont.) │     │ (cont.) │
   └────┬────┘     └────┬────┘     └────┬────┘
        │               │               │
        └───────┬───────┴───────┬───────┘
                │               │
                ▼               ▼
          ┌──────────┐   ┌──────────┐
          │  MERGE   │   │ Aggregate│
          │ (9 inputs)│   │ Batch 1  │
          └────┬─────┘   └────┬─────┘
               │              │
               └──────┬───────┘
                      ▼
              ┌──────────────┐
              │   Batch 2    │
              │   Queries    │
              │  (8 HTTP +   │
              │  AI Agents)  │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │    MERGE     │
              │  (9 inputs)  │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │  Aggregate   │
              │   Batch 2    │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │   AI AGENT   │◄── Prompt with all data
              │  (Analysis)  │
              └──────┬───────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   ┌───────────┐          ┌───────────┐
   │  Parse &  │          │ Code Node │
   │  Respond  │          │  + Save   │
   │ (Webhook) │          │ to Supa   │
   └───────────┘          └───────────┘
```

---

## Supabase Query URLs

### Batch 1 Queries

| Node | URL Pattern |
|------|-------------|
| Head to Head | `/head_to_head?or=(and(team1_id.eq.{home},team2_id.eq.{away}),and(...))` |
| Odds + Info | `/fixtures?id=eq.{fixture_id}&select=*,home_team:teams!...,odds(*),weather(*)...` |
| Fixture Stats Away | `/fixture_statistics?team_id=eq.{away_id}&order=fixture_id.desc&limit=10` |
| Fixture Stats Home | `/fixture_statistics?team_id=eq.{home_id}&order=fixture_id.desc&limit=10` |
| Recent Form Away | `/fixtures?or=(home_team_id.eq.{id},away_team_id.eq.{id})&status=eq.FT&limit=10` |
| Recent Form Home | `/fixtures?or=(home_team_id.eq.{id},away_team_id.eq.{id})&status=eq.FT&limit=10` |
| Home Team Stats | `/team_season_stats?team_id=eq.{id}&season=eq.2025` |
| Away Team Stats | `/team_season_stats?team_id=eq.{id}&season=eq.2025` |
| Standings | `/standings?or=(team_id.eq.{home},team_id.eq.{away})&season=eq.2025` |

### Batch 2 Queries

| Node | URL Pattern |
|------|-------------|
| Player Match Stats Home | `/player_match_stats?team_id=eq.{id}&order=fixture_id.desc&limit=50` |
| Player Match Stats Away | `/player_match_stats?team_id=eq.{id}&order=fixture_id.desc&limit=50` |
| Player Season Stats Home | `/player_season_stats?team_id=eq.{id}&season=eq.2025&order=rating.desc&limit=15` |
| Player Season Stats Away | `/player_season_stats?team_id=eq.{id}&season=eq.2025&order=rating.desc&limit=15` |
| Fixture Events Home | `/fixture_events?team_id=eq.{id}&type=in.(Goal,Card)&limit=100` |
| Fixture Events Away | `/fixture_events?team_id=eq.{id}&type=in.(Goal,Card)&limit=100` |

---

## Key Metrics Summary

| Metric | Source Table | Used In Factor |
|--------|--------------|----------------|
| xG (Expected Goals) | `fixture_statistics` | A1, B1 |
| Possession % | `fixture_statistics` | D1 |
| Pass Accuracy | `fixture_statistics` | D1 |
| Corners | `fixture_statistics` | D3 |
| Offsides | `fixture_statistics` | D2 |
| Clean Sheets | `team_season_stats` | A3 |
| Goals For/Against Avg | `team_season_stats` | A3, A4 |
| League Rank | `standings` | E1 |
| Form String | `standings` | B2 |
| H2H Record | `head_to_head` | F1, F2 |
| Player Ratings | `player_season_stats` | C2 |
| Penalties Scored/Missed | `player_season_stats` | C1 |
| Injury Info | AI Agent News | C3 |
| Club Context | AI Agent News | E2 |
