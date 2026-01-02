# Prediction System

*Last Updated: January 2, 2026*

---

## Overview

The Prediction System generates AI-powered match predictions using a **6-factor weighted analysis model** with historical learning from past predictions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PREDICTION GENERATION FLOW                          │
│                                                                          │
│  ┌─────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  User   │──►│   Next.js   │──►│    n8n      │──►│  AI Model   │     │
│  │ clicks  │   │   API       │   │  Webhook    │   │  (GPT-4o)   │     │
│  │Generate │   │             │   │             │   │             │     │
│  └─────────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│                       │                  │                  │           │
│                       ▼                  ▼                  ▼           │
│              ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│              │ Data           │  │ Memory         │  │ 6-Factor       │ │
│              │ Aggregation    │  │ Context        │  │ Analysis       │ │
│              │ (Supabase)     │  │ (Past Analyses)│  │ (A-F)          │ │
│              └────────────────┘  └────────────────┘  └────────────────┘ │
│                                                               │         │
│                                                               ▼         │
│                                                     ┌────────────────┐  │
│                                                     │  predictions   │  │
│                                                     │  table         │  │
│                                                     └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Prediction Request

User initiates prediction from the `/predictions` page.

**API Endpoint:** `POST /api/predictions/generate`

**Request:**
```json
{
  "fixture_id": "uuid",
  "model": "openai/gpt-5-mini",
  "custom_prompt": "Focus on defensive matchup"
}
```

### 2. Data Aggregation

The API gathers all relevant data from Supabase:

| Data Type | Table | Purpose |
|-----------|-------|---------|
| Fixture | `fixtures` | Match details |
| Home Team | `teams` | Team info |
| Away Team | `teams` | Team info |
| Venue | `venues` | Stadium info |
| Standings | `standings` | League position |
| Team Stats | `team_season_stats` | Season performance |
| Injuries | `injuries` | Unavailable players |
| Head-to-Head | `head_to_head` | Historical matchups |
| Recent Form | `fixtures` | Last 10 matches |
| Match Stats | `fixture_statistics` | xG, shots, etc. |

### 3. Memory Context

**Key Feature:** The system learns from past predictions.

For each team, it retrieves the last 5 match analyses:

```json
{
  "home_team_learnings": [
    {
      "learning_points": ["xG underrated for this team"],
      "factor_accuracy": { "A": true, "B": false, "C": true },
      "accuracy_score": 72,
      "prediction_correct": true
    }
  ],
  "away_team_learnings": [ ... ]
}
```

**How AI Uses This:**
1. Check which factors were accurate/inaccurate
2. Apply learning points to current prediction
3. Adjust confidence based on past accuracy
4. Identify teams that frequently surprise

### 4. n8n Workflow

The prediction request is sent to n8n for AI processing.

**Webhook:** `https://nn.analyserinsights.com/webhook/football-prediction`

**Workflow Steps:**
1. Receive webhook with all data
2. Fetch live team news (AI Agents scrape web)
3. Format data for AI prompt
4. Send to AI model (GPT-4o, GPT-5-mini, or Gemini)
5. Parse JSON response
6. Return prediction

### 5. AI Analysis

The AI uses the **6-factor model** (see [FACTORS.md](./FACTORS.md)):

| Factor | Weight | What It Analyzes |
|--------|--------|------------------|
| A - Base Strength | 24% | xG, defense, offense |
| B - Form | 22% | Recent results, trends |
| C - Key Players | 11% | Injuries, availability |
| D - Tactical | 20% | Style matchup |
| E - Table Position | 13% | Stakes, motivation |
| F - Head-to-Head | 10% | Historical record |

### 6. Prediction Storage

The prediction is saved to the `predictions` table.

**Key Fields:**
```json
{
  "id": "uuid",
  "fixture_id": "uuid",
  "prediction": "1",
  "overall_index": 65,
  "certainty_score": 72,
  "confidence_pct": 68,
  "factors": {
    "A_base_strength": { "score": 65, "weighted": 15.6, "notes": "..." },
    "B_form": { "score": 72, "weighted": 15.8, "notes": "..." },
    "C_key_players": { "score": 45, "weighted": 5.0, "notes": "..." },
    "D_tactical": { "score": 60, "weighted": 12.0, "notes": "..." },
    "E_table_position": { "score": 55, "weighted": 7.2, "notes": "..." },
    "F_h2h": { "score": 70, "weighted": 7.0, "notes": "..." }
  },
  "score_predictions": [
    { "score": "2-1", "probability": 18 },
    { "score": "1-0", "probability": 14 }
  ],
  "most_likely_score": "2-1",
  "over_under_2_5": "Over",
  "btts": "Yes",
  "key_factors": [ ... ],
  "risk_factors": [ ... ],
  "analysis": "200-word narrative...",
  "model_version": "openai/gpt-5-mini"
}
```

---

## AI Models

| Model | Provider | Speed | Quality | Cost |
|-------|----------|-------|---------|------|
| `gpt-4o` | OpenAI | Medium | High | $$$ |
| `gpt-5-mini` | OpenAI | Fast | Good | $ |
| `gemini-2.5` | Google | Fast | Good | $ |

**Default:** `openai/gpt-5-mini`

---

## Prediction Outputs

### Match Outcome (1X2)

| Code | Meaning |
|------|---------|
| `1` | Home win |
| `X` | Draw |
| `2` | Away win |
| `1X` | Home or draw |
| `X2` | Draw or away |
| `12` | Home or away (no draw) |

### Overall Index

Scale: 1-100

| Range | Interpretation |
|-------|----------------|
| 1-30 | Strongly favors away |
| 31-45 | Moderately favors away |
| 46-54 | Even match |
| 55-69 | Moderately favors home |
| 70-100 | Strongly favors home |

### Confidence Metrics

- **Certainty Score (0-100):** AI's confidence in the prediction
- **Confidence % (0-100%):** Estimated probability of correct prediction
- **Home/Draw/Away %:** Probability distribution

---

## Automation

Predictions are automatically triggered 25 minutes before kickoff.

**Automation Flow:**
```
Cron (every 5 min)
       │
       ▼
Check fixtures 23-28 min before kickoff
       │
       ▼
For fixtures without predictions:
       │
       └──► POST /api/predictions/generate
                     │
                     └──► n8n webhook
                               │
                               └──► AI generates prediction
                                         │
                                         └──► Saved to database
```

See [AUTOMATION.md](./AUTOMATION.md) for timing details.

---

## Frontend Display

### Predictions Page (/predictions)

Shows upcoming fixtures with:
- Match info (teams, date, venue)
- Generate button (if no prediction)
- Prediction card (if exists)

### Prediction Card

```
┌────────────────────────────────────────────────┐
│  Liverpool 2-1 Arsenal                         │
│                                                │
│  ┌──────┐  ┌──────┐  ┌──────┐                 │
│  │  1   │  │  X   │  │  2   │  ◄─ Prediction  │
│  │ 55%  │  │ 25%  │  │ 20%  │                 │
│  └──────┘  └──────┘  └──────┘                 │
│                                                │
│  Overall Index: 65  │  Confidence: 72%         │
│                                                │
│  Key Factors:                                  │
│  • Strong home xG differential                 │
│  • Home on 4-match winning streak              │
│                                                │
│  Risk Factors:                                 │
│  • Key midfielder injury                       │
│                                                │
│  [View Full Analysis]                          │
└────────────────────────────────────────────────┘
```

---

## Custom Prompts

Users can provide custom prompts to focus the AI:

**Examples:**
- "Focus on defensive matchup"
- "Consider weather impact"
- "Weight injuries heavily"
- "Analyze set-piece threat"

The custom prompt is appended to the standard factor analysis prompt.

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Fixture not found" | Invalid UUID | Check fixture exists |
| "Webhook timeout" | n8n slow | Retry or check n8n |
| "Invalid JSON" | AI output error | Retry with different model |
| "Rate limited" | Too many requests | Wait and retry |

---

## Related Documentation

- [FACTORS.md](./FACTORS.md) - 6-factor analysis details
- [MATCH_ANALYSIS.md](./MATCH_ANALYSIS.md) - Post-match analysis
- [ACCURACY_TRACKING.md](./ACCURACY_TRACKING.md) - Accuracy metrics
- [AUTOMATION.md](./AUTOMATION.md) - Auto-generation
