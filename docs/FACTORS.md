# Factor System Documentation

*Last Updated: January 2, 2026*

---

## Overview

The Football Prediction System uses a **6-factor weighted analysis model** (A-F) to generate match predictions. Each factor is scored 0-100 and weighted according to its predictive importance.

```
┌─────────────────────────────────────────────────────────────────┐
│                    6-FACTOR ANALYSIS MODEL                       │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ A: Base      │  │ B: Form      │  │ C: Key       │          │
│   │ Strength     │  │              │  │ Players      │          │
│   │    24%       │  │    22%       │  │    11%       │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │ D: Tactical  │  │ E: Table     │  │ F: Head-to-  │          │
│   │ Matchup      │  │ Position     │  │ Head         │          │
│   │    20%       │  │    13%       │  │    10%       │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│                    Total: 100%                                   │
└─────────────────────────────────────────────────────────────────┘
```

The **overall_index** represents home team advantage:
- **> 50**: Favors home team
- **= 50**: Even match
- **< 50**: Favors away team

---

## Factor Weights

| Factor | Name | Weight | Max Weighted Score |
|--------|------|--------|-------------------|
| **A** | Base Strength | 24% | 24.0 |
| **B** | Form | 22% | 22.0 |
| **C** | Key Players | 11% | 11.0 |
| **D** | Tactical Matchup | 20% | 20.0 |
| **E** | Table Position & Context | 13% | 13.0 |
| **F** | Head-to-Head | 10% | 10.0 |
| | **Total** | **100%** | **100.0** |

---

## Factor Descriptions

### A - Base Strength (24%)

The foundational comparison of team quality based on season-long metrics.

**What it considers:**
- xG (Expected Goals) balance - xG for vs xG against
- Home advantage differential
- Defensive stability (clean sheets, goals conceded)
- Offensive production (goals scored, shots on target)

**Data Sources:**
| Source | Table | Fields |
|--------|-------|--------|
| Season Stats | `team_season_stats` | `goals_for_avg`, `goals_against_avg`, `clean_sheets` |
| Match Stats | `fixture_statistics` | `expected_goals`, `shots_on_goal` |
| Home/Away Split | `team_season_stats` | `home_stats`, `away_stats` |

**Scoring Example:**
- Score 75: Home team significantly stronger overall
- Score 50: Teams evenly matched
- Score 25: Away team significantly stronger

---

### B - Form (22%)

Recent performance trends over the last 5-10 matches.

**What it considers:**
- xG form trend (improving/declining)
- Results form (W/D/L pattern)
- Quality of recent opponents faced
- Consistency vs volatility

**Data Sources:**
| Source | Table | Fields |
|--------|-------|--------|
| Recent Form | `team_season_stats` | `form` (e.g., "WDWWL") |
| Last 10 xG | `fixture_statistics` | `expected_goals` (last 10 matches) |
| Opponent Quality | `standings` | `rank` of recent opponents |

**Scoring Example:**
- Score 80: Home team on hot streak, away team struggling
- Score 50: Both teams in similar form
- Score 30: Away team in better form

---

### C - Key Players (11%)

Impact of personnel availability and quality.

**What it considers:**
- Key absences (injuries, suspensions)
- Star player availability
- Penalty taker availability
- Top scorer/assister form

**Data Sources:**
| Source | Table | Fields |
|--------|-------|--------|
| Injuries | `injuries` | `player_name`, `type`, `reason` |
| Lineups | `lineups` | `starting_xi` (when available) |
| Penalties | `team_season_stats` | `penalties_scored`, `penalties_missed` |

**Scoring Example:**
- Score 70: Away missing key players, home at full strength
- Score 50: Both teams have similar availability
- Score 35: Home missing star striker

---

### D - Tactical Matchup (20%)

How the teams' playing styles interact.

**What it considers:**
- Press vs build-up style matchup
- High line vs pace/counter-attack threat
- Aerial duel advantage
- Transition efficiency

**Data Sources:**
| Source | Table | Fields |
|--------|-------|--------|
| Playing Style | `fixture_statistics` | `ball_possession`, `passes_total`, `offsides` |
| Physical | `fixture_statistics` | `fouls`, duels patterns |
| Set Pieces | `fixture_statistics` | `corners`, headed goals |

**Scoring Example:**
- Score 65: Home's pressing style suits against away's slow build-up
- Score 50: No clear tactical advantage
- Score 40: Away's counter-attack exploits home's high line

---

### E - Table Position & Context (13%)

League standing and situational motivation.

**What it considers:**
- Current league position and points gap
- Stakes (title race, relegation, European spots)
- Derby/rivalry intensity
- Club context (manager changes, off-field issues)

**Data Sources:**
| Source | Table | Fields |
|--------|-------|--------|
| Standings | `standings` | `rank`, `points`, `description` |
| Fixture Context | `fixtures` | `round`, match timing |

**Scoring Example:**
- Score 70: Home fighting for title, away mid-table with nothing to play for
- Score 50: Similar stakes for both teams
- Score 35: Away in must-win relegation battle

---

### F - Head-to-Head (10%)

Historical record between the two teams.

**What it considers:**
- Results in last 5-10 meetings
- Patterns at this venue
- Goal-scoring trends in H2H matches
- Any psychological edge

**Data Sources:**
| Source | Table | Fields |
|--------|-------|--------|
| H2H History | `head_to_head` | `fixture_data` (last 10 meetings) |
| Venue H2H | `fixtures` | Historical matches at venue |

**Scoring Example:**
- Score 75: Home has won 8 of last 10 meetings
- Score 50: Even split in recent meetings
- Score 30: Away team dominates historically

---

## Scoring Guidelines

Each factor is scored 0-100:

| Score Range | Interpretation |
|-------------|----------------|
| **0-20** | Strongly favors AWAY team |
| **21-40** | Moderately favors AWAY team |
| **41-49** | Slightly favors AWAY team |
| **50** | Neutral / Even |
| **51-59** | Slightly favors HOME team |
| **60-79** | Moderately favors HOME team |
| **80-100** | Strongly favors HOME team |

---

## Weighted Calculation

```
overall_index = (A_score × 0.24) + (B_score × 0.22) + (C_score × 0.11) +
                (D_score × 0.20) + (E_score × 0.13) + (F_score × 0.10)
```

**Example Calculation:**

| Factor | Score | Weight | Weighted |
|--------|-------|--------|----------|
| A | 65 | 0.24 | 15.6 |
| B | 72 | 0.22 | 15.8 |
| C | 45 | 0.11 | 5.0 |
| D | 60 | 0.20 | 12.0 |
| E | 55 | 0.13 | 7.2 |
| F | 70 | 0.10 | 7.0 |
| **Total** | | | **62.6** |

Result: `overall_index = 63` (favors home team)

---

## Prediction Output Format

The AI returns predictions in this JSON structure:

```json
{
  "prediction": "1",
  "certainty_score": 72,
  "confidence_pct": 68,
  "overall_index": 63,
  "home_win_pct": 55,
  "draw_pct": 25,
  "away_win_pct": 20,
  "factors": {
    "A_base_strength": {
      "score": 65,
      "weighted": 15.6,
      "notes": "Home xG balance +0.4 per game, strong defensive record"
    },
    "B_form": {
      "score": 72,
      "weighted": 15.8,
      "notes": "Home W4-D1-L0 last 5, away team inconsistent"
    },
    "C_key_players": {
      "score": 45,
      "weighted": 5.0,
      "notes": "Home missing key midfielder, away at full strength"
    },
    "D_tactical": {
      "score": 60,
      "weighted": 12.0,
      "notes": "Home's press should trouble away's slow build-up"
    },
    "E_table_position": {
      "score": 55,
      "weighted": 7.2,
      "notes": "Both chasing top 4, similar motivation"
    },
    "F_h2h": {
      "score": 70,
      "weighted": 7.0,
      "notes": "Home unbeaten in last 6 meetings at this venue"
    }
  },
  "score_predictions": [
    {"score": "2-1", "probability": 18},
    {"score": "1-0", "probability": 14},
    {"score": "1-1", "probability": 12}
  ],
  "most_likely_score": "2-1",
  "over_under_2_5": "Over",
  "btts": "Yes",
  "key_factors": [
    "Factor A: Strong xG differential at home",
    "Factor B: Home on 4-match winning streak",
    "Factor F: Excellent H2H record at venue"
  ],
  "risk_factors": [
    "Factor C: Key midfielder injury could impact creativity",
    "Factor D: Away's counter-attack threat if home over-commit"
  ],
  "analysis": "Liverpool enter as favorites with strong home form..."
}
```

---

## Confidence Metrics

### Certainty Score (0-100)

The AI's confidence in the prediction based on data quality and factor alignment.

| Score | Meaning |
|-------|---------|
| 80-100 | Very high confidence - clear favorite |
| 60-79 | Good confidence - reasonable edge |
| 40-59 | Moderate confidence - competitive match |
| 0-39 | Low confidence - unpredictable |

### Confidence Percentage (0-100%)

The probability the predicted outcome is correct.

---

## Historical Learning Integration

The system uses **memory context** from past analyses to improve predictions:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY CONTEXT FLOW                           │
│                                                                  │
│   Past Analysis ──► Factor Accuracy Review ──► Current Prediction│
│                                                                  │
│   For each team, the AI considers:                              │
│   • Which factors were accurate in past predictions              │
│   • Learning points from previous matches                        │
│   • Surprise patterns (when predictions were wrong)              │
│   • Performance vs prediction trends                             │
└─────────────────────────────────────────────────────────────────┘
```

**Memory Context Fields:**
- `home_team_learnings` - Analysis history for home team
- `away_team_learnings` - Analysis history for away team
- `accuracy_score` - Past prediction accuracy per team
- `prediction_correct` - Track record of predictions

---

## AI Model Options

The prediction system supports multiple AI models:

| Model | Provider | Use Case |
|-------|----------|----------|
| `gpt-4o` | OpenAI | High-quality analysis (default) |
| `gpt-5-mini` | OpenAI | Fast, cost-effective |
| `gemini-2.5` | Google | Alternative provider |

---

## Related Documentation

- [PREDICTION_SYSTEM.md](./PREDICTION_SYSTEM.md) - End-to-end prediction flow
- [MATCH_ANALYSIS.md](./MATCH_ANALYSIS.md) - Post-match analysis system
- [ACCURACY_TRACKING.md](./ACCURACY_TRACKING.md) - How accuracy is measured
