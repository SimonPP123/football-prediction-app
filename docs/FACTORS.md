# Factor System Documentation

## Overview

The Football Prediction System uses a structured factor-based approach to generate match predictions. Each match is analyzed across 9 major factor groups (A-I), with sub-factors scored 1-100.

The **overall_index** represents home team advantage:
- **> 50**: Favors home team
- **= 50**: Even match
- **< 50**: Favors away team

---

## Factor Groups

### A - Base Strength (Weight: 18%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| xG Ratings | A1 | Expected goals for/against per 90 | `team_season_stats.goals_for_avg`, `fixture_statistics.expected_goals` |
| Home Advantage | A2 | Team's home vs away performance differential | `team_season_stats.home_stats`, `team_season_stats.away_stats` |
| Defensive Stability | A3 | Goals conceded, clean sheets | `team_season_stats.goals_against_avg`, `team_season_stats.clean_sheets` |
| Offensive Production | A4 | Goals scored, shots on target | `team_season_stats.goals_for_avg`, `fixture_statistics.shots_on_goal` |
| xG Luck | A5 | Actual goals vs xG (over/under-performing) | Compare `goals` vs `expected_goals` over last 10 |

### B - Form (Weight: 16%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| xG Form | B1 | xG trend over last 10 matches | Last 10 `fixture_statistics.expected_goals` |
| Results Form | B2 | W/D/L in last 5-10 games | `team_season_stats.form`, last 10 `fixtures` |
| Opponent Quality | B3 | Strength of recent opponents | Cross-reference opponent `standings.rank` |
| Consistency | B4 | Variance in performance | Standard deviation of xG/goals last 10 |

### C - Squad & Availability (Weight: 14%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| Key Absences | C1 | Number/quality of injured key players | `injuries` table, cross with player importance |
| Returns | C2 | Players returning from injury | `injuries` end dates vs match date |
| XI Cohesion | C3 | Consistency of starting lineup | `lineups.starting_xi` comparison last 5 |
| Rotation Risk | C4 | Likelihood of squad rotation | Match congestion + cup commitments |
| New Coach | C5 | Manager tenure < 10 games | Coach start date vs fixture date |
| Goalkeeper Effect | C6 | GK quality and form | GK player stats if available |
| Set Pieces | C7 | Corner/free-kick threat | `fixture_statistics.corners` + set piece goals |
| Penalties | C8 | Penalty conversion rate | `team_season_stats.penalties_scored/missed` |

### D - Load & Calendar (Weight: 10%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| Rest Days | D1 | Days since last match | Previous `fixtures.match_date` |
| Congestion | D2 | Matches in last 7/14 days | Count `fixtures` in date range |
| Travel | D3 | Distance traveled recently | Venue locations + last away match |
| Competition Priority | D4 | Focus on other competitions | Check for CL/EL/Cup matches nearby |
| Match Time | D5 | Unusual kickoff time | `fixtures.match_date` time component |

### E - Tactical Matchup (Weight: 12%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| Press vs Build-up | E1 | High press team vs possession team | `fixture_statistics` passing/duels patterns |
| High Line vs Pace | E2 | Defensive line style vs counter threat | Offsides, through ball success |
| Aerial Duels | E3 | Height advantage in aerials | Headed goals, corner threat |
| Transitions | E4 | Counter-attack efficiency | Quick goal patterns, fouls |
| Coach H2H | E5 | Historical manager matchups | Filter H2H by coach names |

### F - Motivation & Stakes (Weight: 10%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| Table Stakes | F1 | Title race, relegation, European spots | `standings.rank` + `standings.description` |
| Derby Factor | F2 | Rivalry intensity | Hardcoded derby pairs |
| European Hangover | F3 | CL/EL match 3-4 days prior | Check fixtures for European games |
| Club Context | F4 | News, off-pitch issues | Manual/external news API |
| Holiday Factor | F5 | Major holidays affecting prep | Calendar check |

### G - Referee (Weight: 5%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| Card Tendency | G1 | Yellow/red cards per game | `referee_stats.avg_yellow_cards`, `avg_red_cards` |
| Penalty Tendency | G2 | Penalties awarded per game | `referee_stats.penalties_per_match` |

### H - Stadium & Weather (Weight: 8%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| Pitch Condition | H1 | Surface type compatibility | `venues.surface` vs team style |
| Attendance Effect | H2 | Home crowd intensity | `venues.capacity` + historical attendance |
| Neutral Venue | H3 | Playing away from home stadium | `fixtures.venue_id` vs `teams.venue_id` |
| Weather - Rain | H4 | Heavy precipitation impact | `weather.precipitation` |
| Weather - Temp | H5 | Extreme temperature impact | `weather.temperature` |

### I - Head-to-Head (Weight: 7%)

| Factor | Code | Description | Data Source |
|--------|------|-------------|-------------|
| H2H Results | I1 | Win/draw/loss in last 10 meetings | `head_to_head.fixture_data` |
| H2H Quality | I2 | xG difference in H2H matches | H2H fixtures' `fixture_statistics` |

---

## Scoring Guidelines

Each factor is scored 1-100:

| Score | Meaning |
|-------|---------|
| 1-20 | Strongly favors AWAY team |
| 21-40 | Slightly favors AWAY team |
| 41-60 | Neutral / Even |
| 51-60 | Slightly favors HOME team |
| 61-80 | Moderately favors HOME team |
| 81-100 | Strongly favors HOME team |

---

## Weighted Calculation

```
overall_index = (A_score * 0.18) + (B_score * 0.16) + (C_score * 0.14) +
                (D_score * 0.10) + (E_score * 0.12) + (F_score * 0.10) +
                (G_score * 0.05) + (H_score * 0.08) + (I_score * 0.07)
```

Where each group score is the average of its sub-factors.

---

## Prediction Output

```json
{
  "overall_index": 65,
  "prediction_result": "1",
  "confidence_level": "medium",
  "factors": {
    "a1_xg_ratings": 72,
    "a2_home_advantage": 68,
    "a3_defensive_stability": 55,
    "a4_offensive_production": 70,
    "a5_xg_luck": 48,
    "b1_xg_form": 65,
    "b2_results_form": 60,
    "b3_opponent_quality": 58,
    "b4_consistency": 62,
    "c1_key_absences": 75,
    "c2_returns": 50,
    "c3_xi_cohesion": 55,
    "c4_rotation_risk": 60,
    "c5_new_coach": 50,
    "c6_goalkeeper_effect": 55,
    "c7_set_pieces": 65,
    "c8_penalties": 58,
    "d1_rest_days": 70,
    "d2_congestion": 55,
    "d3_travel": 60,
    "d4_competition_priority": 50,
    "d5_match_time": 50,
    "e1_press_vs_buildup": 60,
    "e2_high_line_vs_pace": 55,
    "e3_aerial_duels": 65,
    "e4_transitions": 58,
    "e5_coach_h2h": 50,
    "f1_table_stakes": 70,
    "f2_derby_factor": 50,
    "f3_european_hangover": 55,
    "f4_club_context": 50,
    "f5_holiday_factor": 50,
    "g1_card_tendency": 52,
    "g2_penalty_tendency": 55,
    "h1_pitch_condition": 55,
    "h2_attendance_effect": 70,
    "h3_neutral_venue": 50,
    "h4_weather_rain": 50,
    "h5_weather_temp": 50,
    "i1_h2h_results": 65,
    "i2_h2h_quality": 60
  },
  "analysis_text": "Manchester City hold a significant home advantage with strong xG metrics...",
  "key_factors": [
    "Strong home xG differential (A1: 72)",
    "Key midfielder injury for visitors (C1: 75)",
    "Important table stakes for both teams (F1: 70)"
  ],
  "risk_factors": [
    "Away team slightly over-performing xG (A5: 48)",
    "Congested fixture schedule (D2: 55)"
  ]
}
```

---

## Confidence Levels

| Level | Overall Index Range | Description |
|-------|---------------------|-------------|
| High | > 70 or < 30 | Strong conviction in prediction |
| Medium | 55-70 or 30-45 | Moderate lean toward one side |
| Low | 45-55 | Effectively a coin flip |

---

## AI Prompt Template

When calling the AI (GPT-4o) for predictions, use this system prompt structure:

```
You are an expert football analyst. Analyze the provided match data using the factor system (A-I). Score each sub-factor from 1-100 where:
- > 50 favors HOME team
- < 50 favors AWAY team
- = 50 is neutral

Return ONLY valid JSON matching this schema:
{
  "overall_index": number (1-100),
  "prediction_result": "1" | "X" | "2" | "1X" | "X2" | "12",
  "confidence_level": "high" | "medium" | "low",
  "factors": { ... all factor codes with scores ... },
  "analysis_text": "string",
  "key_factors": ["string", ...],
  "risk_factors": ["string", ...]
}
```
