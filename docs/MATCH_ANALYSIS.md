# Match Analysis System

*Last Updated: January 2, 2026*

---

## Overview

The Match Analysis System generates **post-match AI reviews** that compare predictions to actual results, identify what went right/wrong, and extract learning points for future predictions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       MATCH ANALYSIS FLOW                                │
│                                                                          │
│   Match Ends (FT)                                                        │
│        │                                                                 │
│        ▼                                                                 │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│   │ Wait 6h 15m  │────►│ Automation   │────►│ AI Analysis  │            │
│   │ for stats    │     │ Trigger      │     │ Generation   │            │
│   └──────────────┘     └──────────────┘     └──────────────┘            │
│                                                    │                     │
│                                                    ▼                     │
│                                          ┌──────────────────┐           │
│                                          │  match_analysis  │           │
│                                          │     table        │           │
│                                          └────────┬─────────┘           │
│                                                   │                      │
│                              ┌────────────────────┼────────────────────┐│
│                              │                    │                    ││
│                              ▼                    ▼                    ▼│
│                        ┌──────────┐        ┌──────────┐        ┌──────────┐
│                        │ Learning │        │ Accuracy │        │ Factor   │
│                        │ Points   │        │ Score    │        │ Accuracy │
│                        └──────────┘        └──────────┘        └──────────┘
│                              │                                           │
│                              └───────────────────────────────────────────┘
│                                              │
│                                              ▼
│                                    Future Predictions
│                                    (Memory Context)
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Trigger Methods

Analysis can be generated through three methods:

### 1. Manual Trigger

User clicks "Generate Analysis" button on a completed match.

```
POST /api/match-analysis/generate
{
  "fixture_id": "uuid",
  "model": "openai/gpt-5-mini"
}
```

### 2. Auto-Trigger (Cron)

Every 2 hours, the system checks for matches that:
- Completed 1-7 hours ago
- Have a prediction
- Don't have an analysis yet

```
POST /api/match-analysis/auto-trigger
```

### 3. Automation System

The automation cron triggers analysis at 6h 15min after Full Time.

See [AUTOMATION.md](./AUTOMATION.md) for details.

---

## What It Analyzes

### Prediction Accuracy

| Metric | What's Compared |
|--------|-----------------|
| **Result** | Predicted 1/X/2 vs actual |
| **Score** | Predicted scoreline vs actual |
| **Over/Under** | Over/Under 2.5 goals |
| **BTTS** | Both Teams To Score |

### Factor Accuracy

For each of the 6 factors (A-F), the AI evaluates:
- Was the factor's influence correctly predicted?
- Was the score (0-100) appropriate?
- What actually happened?

```json
{
  "factor_accuracy": {
    "A_base_strength": {
      "accurate": true,
      "reason": "Home team's xG superiority materialized as expected"
    },
    "B_form": {
      "accurate": false,
      "reason": "Away team outperformed recent form significantly"
    }
  }
}
```

### Team Performance

Actual match statistics compared to predictions:
- xG vs actual goals
- Possession %
- Shots on target
- Key events (goals, cards)

---

## Analysis Output

### Key Fields

```json
{
  "id": "uuid",
  "fixture_id": "uuid",

  "predicted_result": "1",
  "actual_result": "X",
  "prediction_correct": false,

  "predicted_score": "2-1",
  "actual_score": "1-1",
  "score_correct": false,

  "predicted_over_under": "Over",
  "actual_over_under": "Under",
  "over_under_correct": false,

  "predicted_btts": "Yes",
  "actual_btts": "Yes",
  "btts_correct": true,

  "overall_index": 65,
  "confidence_pct": 72,
  "accuracy_score": 35.5,

  "factor_accuracy": { ... },
  "home_team_performance": { ... },
  "away_team_performance": { ... },

  "post_match_analysis": "Narrative analysis text...",
  "key_insights": [
    "Away team's defensive improvement was underestimated",
    "Set pieces proved decisive despite low prediction weight"
  ],
  "learning_points": [
    "This team tends to raise performance in big matches",
    "Factor B (form) accuracy has been low for away team"
  ],
  "surprises": [
    "Star striker failed to convert 3 clear chances",
    "Referee awarded unexpected penalty in 89th minute"
  ]
}
```

---

## Accuracy Score Calculation

The accuracy score (0-100) is calculated as:

```
accuracy_score = (
  result_weight * (prediction_correct ? 1 : 0) +
  score_weight * (score_correct ? 1 : 0) +
  ou_weight * (over_under_correct ? 1 : 0) +
  btts_weight * (btts_correct ? 1 : 0)
) * 100

Weights:
- Result: 40%
- Score: 30%
- Over/Under: 15%
- BTTS: 15%
```

### Score Breakdown

| Score | Meaning |
|-------|---------|
| 85-100 | Excellent - all/most correct |
| 70-84 | Good - result + some extras correct |
| 55-69 | Average - result correct, extras wrong |
| 40-54 | Poor - result wrong, some extras correct |
| 0-39 | Bad - most/all wrong |

---

## Memory Context Learning

**Critical Feature:** Analysis data feeds back into future predictions.

When generating a new prediction for Liverpool vs Arsenal:

1. System fetches last 5 analyses involving Liverpool
2. System fetches last 5 analyses involving Arsenal
3. This data is sent to AI as "memory context"
4. AI adjusts predictions based on:
   - Which factors were accurate/inaccurate
   - Learning points from past matches
   - Surprise patterns

### Learning Point Examples

```json
{
  "learning_points": [
    "This team consistently outperforms xG at home - trust actual goals over xG",
    "Factor C (injuries) impact has been overestimated - depth is strong",
    "Set pieces are a key threat not fully captured in tactical analysis",
    "Manager tends to change tactics significantly against top-6 opponents"
  ]
}
```

---

## n8n Workflow

The analysis is generated via n8n workflow:

**Webhook:** `https://nn.analyserinsights.com/webhook/post-match-analysis`

**Payload:**
```json
{
  "fixture_id": "uuid",
  "home_team": "Liverpool",
  "away_team": "Arsenal",
  "actual_score": "1-1",
  "prediction": { ... },
  "match_statistics": { ... },
  "match_events": [ ... ],
  "model": "openai/gpt-5-mini"
}
```

**Workflow Steps:**
1. Receive webhook with match data
2. Format analysis prompt
3. Send to AI model
4. Parse JSON response
5. Return analysis

---

## Frontend Display

### Match Detail Page

After a match completes, the analysis section shows:

```
┌────────────────────────────────────────────────────────────────────┐
│  POST-MATCH ANALYSIS                                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Prediction Accuracy                                          │  │
│  │                                                               │  │
│  │  Result: ✗ Wrong (predicted 1, actual X)                      │  │
│  │  Score:  ✗ Wrong (predicted 2-1, actual 1-1)                  │  │
│  │  O/U:    ✗ Wrong (predicted Over, actual Under)               │  │
│  │  BTTS:   ✓ Correct (Yes)                                      │  │
│  │                                                               │  │
│  │  Overall Accuracy: 35.5%                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  What Happened                                                │  │
│  │                                                               │  │
│  │  The prediction favored Liverpool based on strong home form   │  │
│  │  and xG superiority. However, Arsenal's defensive setup       │  │
│  │  nullified Liverpool's attacking threat...                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Key Insights:                                                      │
│  • Arsenal's defensive improvement was underestimated              │
│  • Set pieces proved decisive                                       │
│                                                                     │
│  Learning for Future:                                               │
│  • Factor B accuracy has been low for Arsenal                       │
│  • This matchup tends to produce draws                              │
└────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Generate Analysis

```
POST /api/match-analysis/generate
{
  "fixture_id": "uuid",
  "model": "openai/gpt-5-mini"
}
```

### Get Analysis

```
GET /api/match-analysis/{fixture_id}
```

### Auto-Trigger

```
POST /api/match-analysis/auto-trigger
```

Finds completed matches needing analysis and generates them.

---

## Database Schema

See [DATABASE.md](./DATABASE.md) for full `match_analysis` table schema.

Key columns:
- `fixture_id` - Match reference
- `prediction_correct` - Was 1X2 correct?
- `accuracy_score` - Overall accuracy %
- `factor_accuracy` - Per-factor accuracy (JSONB)
- `learning_points` - Insights for future (JSONB)
- `post_match_analysis` - AI narrative (TEXT)

---

## Related Documentation

- [PREDICTION_SYSTEM.md](./PREDICTION_SYSTEM.md) - How predictions are made
- [FACTORS.md](./FACTORS.md) - 6-factor analysis
- [ACCURACY_TRACKING.md](./ACCURACY_TRACKING.md) - Aggregate accuracy stats
- [AUTOMATION.md](./AUTOMATION.md) - Auto-trigger timing
