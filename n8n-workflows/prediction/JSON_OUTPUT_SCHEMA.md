# Prediction JSON Output Schema (6-Factor System)

## Overview

The prediction system uses **6 factors (A-F)** matching the NEW_AI_AGENT_PROMPT.txt. This document describes the expected JSON output format from the n8n AI Agent.

## Factor Weights (Total: 100%)

| Factor | Name | Weight |
|--------|------|--------|
| **A** | Base Strength | 24% |
| **B** | Recent Form | 22% |
| **C** | Key Players | 11% |
| **D** | Tactical Matchup | 20% |
| **E** | Table Position & Context | 13% |
| **F** | Head-to-Head | 10% |

## Complete Example Response

```json
{
  "prediction": "1",
  "confidence_pct": 72,
  "overall_index": 64,
  "home_win_pct": 58,
  "draw_pct": 24,
  "away_win_pct": 18,
  "factors": {
    "A_base_strength": {
      "score": 68,
      "weighted": 16.32,
      "notes": "Home has superior xG balance (+0.6/game), strong home record (75% home points), excellent defensive stability"
    },
    "B_form": {
      "score": 72,
      "weighted": 15.84,
      "notes": "Home on strong xG trend (+1.2 xGF last 5), 4W-1D recent form vs top-10 opponents"
    },
    "C_key_players": {
      "score": 52,
      "weighted": 5.72,
      "notes": "Home has reliable penalty taker (90% success), top scorer in form. Away missing key defender (injury)"
    },
    "D_tactical": {
      "score": 65,
      "weighted": 13.0,
      "notes": "Home's high press (18 fouls/game) disrupts away's build-up. Home strong aerially"
    },
    "E_table_position": {
      "score": 58,
      "weighted": 7.54,
      "notes": "Home fighting for top-4 (3 points behind), away mid-table and safe"
    },
    "F_h2h": {
      "score": 70,
      "weighted": 7.0,
      "notes": "Home won 4 of last 5 H2H (1.8 goals/game), dominated by xG in last 3 meetings"
    }
  },
  "score_predictions": [
    {"score": "2-1", "probability": 18},
    {"score": "1-0", "probability": 14},
    {"score": "2-0", "probability": 12},
    {"score": "1-1", "probability": 11},
    {"score": "3-1", "probability": 8},
    {"score": "0-0", "probability": 6},
    {"score": "0-1", "probability": 5},
    {"score": "2-2", "probability": 5},
    {"score": "1-2", "probability": 4},
    {"score": "other", "probability": 17}
  ],
  "most_likely_score": "2-1",
  "over_under_2_5": "Over",
  "btts": "Yes",
  "value_bet": "Home Win @ 2.10 (edge: +8%)",
  "key_factors": [
    "Factor A: Home's xG balance +0.6/game better than away",
    "Factor B: Home's strong recent form (4W-1D) against top opposition",
    "Factor F: Home won 4 of last 5 H2H with dominant performances"
  ],
  "risk_factors": [
    "Factor C: Away missing key defender increases home's attacking threat",
    "Factor E: Home under pressure to secure top-4, could lead to nerves",
    "Factor D: Away's counter-attacking threat with pace on wings"
  ],
  "analysis": "Home team enters this fixture as strong favorites based on multiple converging factors. Their superior underlying metrics (Factor A: 68, +16.32 weighted) are underpinned by a +0.6 xG/game advantage and exceptional home form. Recent performances (Factor B: 72, +15.84) show sustained quality against strong opposition. The tactical matchup (Factor D: 65, +13.0) favors the home side's high-pressing style. Historical dominance (Factor F: 70, +7.0) adds psychological confidence. Prediction: Home Win (1) with 72% confidence, most likely 2-1."
}
```

## Factor Structure

### 6-Factor System (A-F)

| Factor Code | Name | Weight | Description |
|-------------|------|--------|-------------|
| **A** | Base Strength | 24% | xG balance, home advantage, defensive stability, offensive production |
| **B** | Recent Form | 22% | xG form trend, results form, opponent quality, consistency |
| **C** | Key Players | 11% | Penalty reliability, top performers, injury impact |
| **D** | Tactical Matchup | 20% | Press vs build-up, high line vs pace, aerial duels |
| **E** | Table Position & Context | 13% | Table stakes, club context |
| **F** | Head-to-Head | 10% | H2H results, H2H quality patterns |

**Total Weight: 100%**

## Field Descriptions

### Top-Level Fields

| Field | Type | Range/Values | Description |
|-------|------|--------------|-------------|
| `prediction` | string | "1", "X", "2", "1X", "X2", "12" | Match outcome prediction |
| `confidence_pct` | number | 0-100 | Confidence in the prediction |
| `overall_index` | number | 1-100 | Weighted sum of all factors (>50 favors home, <50 favors away) |
| `home_win_pct` | number | 0-100 | Probability of home win |
| `draw_pct` | number | 0-100 | Probability of draw |
| `away_win_pct` | number | 0-100 | Probability of away win |

**Note:** `home_win_pct + draw_pct + away_win_pct` must equal 100

### Prediction Values

| Value | Meaning | Overall Index Range |
|-------|---------|---------------------|
| `"1"` | Home Win | 60-100 |
| `"1X"` | Home Win or Draw | 55-59 |
| `"X"` | Draw | 45-54 |
| `"X2"` | Draw or Away Win | 41-44 |
| `"2"` | Away Win | 1-40 |
| `"12"` | Either Team Wins (No Draw) | 45-54 (when draw unlikely) |

### Factor Object Structure

Each factor in the `factors` object has:

```typescript
{
  score: number,        // 1-100, >50 favors home, <50 favors away, 50 = neutral
  weighted: number,     // Contribution to overall index (score × weight)
  notes: string         // Summary of key findings for this factor
}
```

**Example:**
```json
"A_base_strength": {
  "score": 68,
  "weighted": 16.32,    // 68 × 0.24 = 16.32
  "notes": "Home has superior xG balance..."
}
```

### Factor Weighted Calculation

| Factor | Weight | Example Score | Weighted Value |
|--------|--------|---------------|----------------|
| A | 24% | 68 | 68 × 0.24 = 16.32 |
| B | 22% | 72 | 72 × 0.22 = 15.84 |
| C | 11% | 52 | 52 × 0.11 = 5.72 |
| D | 20% | 65 | 65 × 0.20 = 13.00 |
| E | 13% | 58 | 58 × 0.13 = 7.54 |
| F | 10% | 70 | 70 × 0.10 = 7.00 |
| **Total** | **100%** | | **overall_index ≈ 65.42** |

### Score Predictions

Array of 10 most likely scorelines with probabilities:

```typescript
{
  score: string,        // Format: "X-Y" (home-away)
  probability: number   // Percentage (0-100)
}
```

Must include at least 9 specific scorelines plus an "other" category. All probabilities must sum to 100.

### Betting Fields

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `most_likely_score` | string | "2-1" | Most probable scoreline |
| `over_under_2_5` | string | "Over" or "Under" | Total goals prediction |
| `btts` | string | "Yes" or "No" | Both Teams To Score |
| `value_bet` | string or null | "Home Win @ 2.10 (edge: +8%)" | Identified betting value |

### Key & Risk Factors

Both are arrays of strings (3-5 items recommended):

```json
"key_factors": [
  "Factor A: Home's xG balance +0.6/game better",
  "Factor F: Home won 4 of last 5 H2H"
],
"risk_factors": [
  "Factor C: Home striker carrying injury concern",
  "Factor D: Away's counter-attacking threat"
]
```

### Analysis

A comprehensive 200-300 word analysis explaining:
- The prediction and confidence level
- Key factors driving the decision
- Tactical insights
- Risk factors and uncertainties
- Specific data points referenced

## Data Validation Rules

### Required Fields
All top-level fields are required except:
- `value_bet` (can be `null` if no value identified)

### Factor Validation
- All 6 factors (A-F) must be present
- Each factor must have `score`, `weighted`, and `notes`
- `score` must be between 1-100
- `weighted` should equal `score × factor_weight` (within rounding tolerance)
- Sum of all `weighted` values should equal `overall_index` (within rounding tolerance)

### Score Validation
- Individual factor scores: 1-100
- >50 indicates favoring the home team
- <50 indicates favoring the away team
- 50 is neutral/balanced

### Probability Validation
- `home_win_pct + draw_pct + away_win_pct = 100`
- All `score_predictions` probabilities sum to 100

## Backward Compatibility

The frontend components support both old and new factor structures:

- **New predictions** will use A-F (6 factors)
- **Old predictions** (with 7 or 9 factors) will still display correctly
- Only factors present in the data will be rendered
- Legacy factor definitions are maintained for historical data

### Legacy Factor Mapping

| Old Factor | New Factor |
|------------|------------|
| C_squad | C_key_players |
| D_load | (removed) |
| E_tactical | D_tactical |
| F_motivation | (merged into E) |
| F_weather | (removed) |
| G_referee | (removed) |
| G_h2h / I_h2h | F_h2h |
| H_stadium_weather | (removed) |

## Usage in n8n Workflow

### AI Agent Node
Copy the prompt from `NEW_AI_AGENT_PROMPT.txt` and paste it into the AI Agent node's prompt field.

### Parse AI Response Node
No changes needed - current code handles variable factor structures automatically.

### Frontend Display
`recent-result-card.tsx` and `factor-breakdown.tsx` automatically use new factor definitions for new predictions while maintaining backward compatibility.

## Testing Checklist

After implementing:

✅ Verify all 6 factors (A-F) are returned
✅ Check that weights sum to 100% (24+22+11+20+13+10)
✅ Confirm `overall_index` equals sum of weighted factors
✅ Validate `home_win_pct + draw_pct + away_win_pct = 100`
✅ Ensure `score_predictions` probabilities sum to 100
✅ Test frontend display with new prediction
✅ Test frontend display with old 7/9-factor prediction (backward compat)
