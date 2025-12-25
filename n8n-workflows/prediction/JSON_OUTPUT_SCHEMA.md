# Prediction JSON Output Schema (7-Factor System)

## Overview

The new prediction system uses **7 factors (A-G)** instead of the previous 9 factors (A-I). This document describes the expected JSON output format from the n8n AI Agent.

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
      "weighted": 14.96,
      "notes": "Home has superior xG balance (+0.6/game), strong home record (75% home points), excellent defensive stability (8 clean sheets vs 4)"
    },
    "B_form": {
      "score": 72,
      "weighted": 14.4,
      "notes": "Home on strong xG trend (+1.2 xGF last 5), 4W-1D recent form vs top-10 opponents, consistent performances"
    },
    "C_key_players": {
      "score": 52,
      "weighted": 5.2,
      "notes": "Home has reliable penalty taker (90% success), top scorer in form (4 goals in last 3). Away missing key defender Jones (injury)"
    },
    "D_tactical": {
      "score": 65,
      "weighted": 11.7,
      "notes": "Home's high press (18 fouls/game) disrupts away's build-up (75% pass accuracy). Home strong aerially (8 corners/game vs 4)"
    },
    "E_table_position": {
      "score": 58,
      "weighted": 6.96,
      "notes": "Home fighting for top-4 (3 points behind), away mid-table and safe. Positive home momentum after manager backing"
    },
    "F_weather": {
      "score": 48,
      "weighted": 3.84,
      "notes": "Light rain (3mm precipitation), 12°C temperature, 15km/h wind. Neutral impact on playing styles"
    },
    "G_h2h": {
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
    "Factor G: Home won 4 of last 5 H2H with dominant performances"
  ],
  "risk_factors": [
    "Factor C: Away missing key defender Jones increases home's attacking threat",
    "Factor E: Home under pressure to secure top-4, could lead to nerves",
    "Factor D: Away's counter-attacking threat with pace on wings"
  ],
  "analysis": "Home team enters this fixture as strong favorites based on multiple converging factors. Their superior underlying metrics (Factor A: 68, +14.96 weighted) are underpinned by a +0.6 xG/game advantage and exceptional home form. Recent performances (Factor B: 72, +14.4) show sustained quality against strong opposition, with a 4W-1D record and consistent xG creation. The tactical matchup (Factor D: 65, +11.7) favors the home side's high-pressing style against an away team that struggles to build from the back. Historical dominance in this fixture (Factor G: 70, +7.0) adds psychological confidence. The key concern is pressure from the table position (Factor E: 58), as home fights for Champions League qualification. Away's injury to defender Jones (Factor C notes) weakens their backline significantly. Weather conditions are neutral. Prediction: Home Win (1) with 72% confidence, most likely 2-1. Value bet identified at 2.10 odds with +8% edge over implied probability."
}
```

## Factor Structure

### New 7-Factor System

| Factor Code | Name | Weight | Sub-Factors |
|-------------|------|--------|-------------|
| **A** | Base Strength | 22% | A1: xG Balance (12%), A2: Home Advantage (4%), A3: Defensive Stability (3%), A4: Offensive Production (2%), A5: xG Luck (1%) |
| **B** | Recent Form | 20% | B1: xG Form Trend (12%), B2: Results Form (4%), B3: Opponent Quality (2%), B4: Consistency (2%) |
| **C** | Key Players | 10% | C1: Penalty Reliability (4%), C2: Top Performers (3%), C3: Injury Impact (3%) |
| **D** | Tactical Matchup | 18% | D1: Press vs Build-up (10%), D2: High Line vs Pace (4%), D3: Aerial Duels (4%) |
| **E** | Table Position & Context | 12% | E1: Table Stakes (10%), E2: Club Context (2%) |
| **F** | Weather Conditions | 8% | F1: Precipitation Impact (4%), F2: Temperature & Wind (4%) |
| **G** | Head-to-Head | 10% | G1: H2H Results (6%), G2: H2H Quality (4%) |

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
  "weighted": 14.96,    // 68 × 0.22 = 14.96
  "notes": "Home has superior xG balance..."
}
```

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
  "Factor G: Home won 4 of last 5 H2H"
],
"risk_factors": [
  "Factor C: Home striker carrying injury concern",
  "Factor F: Heavy rain suits away's direct style"
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
- All 7 factors (A-G) must be present
- Each factor must have `score`, `weighted`, and `notes`
- `score` must be between 1-100
- `weighted` should equal `score × factor_weight` (within rounding tolerance)
- Sum of all `weighted` values should equal `overall_index` (within rounding tolerance)

### Score Validation
- Individual factor scores: 1-100
- >50 indicates favoringthe home team
- <50 indicates favoring the away team
- 50 is neutral/balanced

### Probability Validation
- `home_win_pct + draw_pct + away_win_pct = 100`
- All `score_predictions` probabilities sum to 100

## Differences from Old 9-Factor System

### Removed Factors
- **Old D (Load & Calendar)** - Removed due to lack of fixture congestion data
- **Old G (Referee)** - Removed due to referee_stats not being fetched
- **Old H (Stadium & Weather)** - Simplified to new F (Weather only)

### Renamed/Merged Factors
- **Old C (Squad)** → **New C (Key Players)** - Simplified to penalty takers, top performers, and injuries from news
- **Old E (Tactical)** → **New D (Tactical Matchup)** - Letter changed, content similar
- **Old F (Motivation)** → **New E (Table Position & Context)** - Merged with table stakes
- **Old I (H2H)** → **New G (H2H)** - Letter changed, content same

### Weight Redistribution
- Factor A: 18% → 22% (+4%)
- Factor B: 16% → 20% (+4%)
- Factor C: 14% → 10% (-4%, simplified scope)
- Factor D: 12% → 18% (+6%, tactical importance increased)
- Factor E: 10% → 12% (+2%)
- Factor F: 8% → 8% (same)
- Factor G: 7% → 10% (+3%)

**Old Total (A-I):** 18+16+14+10+12+10+5+8+7 = 100%
**New Total (A-G):** 22+20+10+18+12+8+10 = 100%

## Backward Compatibility

The frontend component (`factor-breakdown.tsx`) supports both old and new factor structures:

- **New predictions** will use A-G (7 factors)
- **Old predictions** (with 9 factors A-I) will still display correctly
- Only factors present in the data will be rendered
- Legacy factor definitions are maintained for historical data

## Usage in n8n Workflow

### AI Agent Node
Copy the prompt from `NEW_AI_AGENT_PROMPT.txt` and paste it into the AI Agent node's prompt field.

### Parse AI Response Node
No changes needed - current code handles variable factor structures automatically.

### Frontend Display
Updated `factor-breakdown.tsx` will automatically use new factor definitions for new predictions while maintaining backward compatibility.

## Testing Checklist

After implementing:

✅ Verify all 7 factors (A-G) are returned
✅ Check that weights sum to 100% (22+20+10+18+12+8+10)
✅ Confirm `overall_index` equals sum of weighted factors
✅ Validate `home_win_pct + draw_pct + away_win_pct = 100`
✅ Ensure `score_predictions` probabilities sum to 100
✅ Verify injuries are extracted from AI Agent news
✅ Confirm club context is extracted from AI Agent news
✅ Test frontend display with new prediction
✅ Test frontend display with old 9-factor prediction (backward compat)
