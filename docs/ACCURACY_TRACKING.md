# Accuracy Tracking System

*Last Updated: January 2, 2026*

---

## Overview

The Accuracy Tracking System measures prediction performance across multiple dimensions: overall accuracy, per-model accuracy, and confidence calibration.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ACCURACY TRACKING SYSTEM                            │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                        DATA SOURCES                               │  │
│   │                                                                   │  │
│   │   predictions table ◄──────────► match_analysis table            │  │
│   │         │                               │                         │  │
│   │         │  prediction_correct           │  accuracy_score         │  │
│   │         │  confidence_pct               │  factor_accuracy        │  │
│   │         │  overall_index                │  btts_correct           │  │
│   │         │  model_version                │  over_under_correct     │  │
│   │         │                               │                         │  │
│   └─────────┼───────────────────────────────┼─────────────────────────┘  │
│             │                               │                            │
│             └───────────────┬───────────────┘                            │
│                             │                                            │
│                             ▼                                            │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                      ACCURACY METRICS                             │  │
│   │                                                                   │  │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │
│   │   │  Overall    │  │  By Model   │  │ Calibration │              │  │
│   │   │  Accuracy   │  │  Breakdown  │  │  Analysis   │              │  │
│   │   └─────────────┘  └─────────────┘  └─────────────┘              │  │
│   │                                                                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                             │                                            │
│                             ▼                                            │
│                    ┌────────────────┐                                   │
│                    │  /stats page   │                                   │
│                    │  (Frontend)    │                                   │
│                    └────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Metrics Tracked

### 1. Result Accuracy

**What:** Percentage of correct 1/X/2 predictions.

```
Result Accuracy = (Correct Predictions / Total Predictions) × 100
```

### 2. Score Accuracy

**What:** Percentage of exact score predictions.

```
Score Accuracy = (Exact Scores / Total Predictions) × 100
```

### 3. Over/Under Accuracy

**What:** Percentage of correct Over/Under 2.5 goals predictions.

```
O/U Accuracy = (Correct O/U / Total Predictions) × 100
```

### 4. BTTS Accuracy

**What:** Percentage of correct Both Teams To Score predictions.

```
BTTS Accuracy = (Correct BTTS / Total Predictions) × 100
```

### 5. Average Accuracy Score

**What:** Mean of individual match accuracy scores (0-100).

```
Avg Accuracy Score = Sum(accuracy_score) / Count(analyses)
```

### 6. Confidence Calibration

**What:** How well confidence percentages match actual accuracy.

| Confidence Range | Expected Accuracy | Actual Accuracy | Calibration |
|------------------|-------------------|-----------------|-------------|
| 80-100% | 90% | 75% | Overconfident |
| 60-79% | 70% | 72% | Well-calibrated |
| 40-59% | 50% | 45% | Well-calibrated |
| 0-39% | 30% | 35% | Well-calibrated |

---

## API Endpoints

### GET /api/accuracy-stats

Returns overall accuracy statistics.

**Response:**
```json
{
  "overall": {
    "totalPredictions": 150,
    "correctPredictions": 92,
    "resultAccuracy": 61.3,
    "scoreAccuracy": 12.0,
    "overUnderAccuracy": 58.7,
    "bttsAccuracy": 62.0,
    "avgAccuracyScore": 55.2
  },
  "period": {
    "start": "2025-08-01",
    "end": "2026-01-02"
  }
}
```

---

### GET /api/accuracy-stats/by-model

Returns accuracy broken down by AI model.

**Response:**
```json
{
  "models": [
    {
      "model": "openai/gpt-4o",
      "predictions": 45,
      "resultAccuracy": 64.4,
      "avgAccuracyScore": 58.3
    },
    {
      "model": "openai/gpt-5-mini",
      "predictions": 80,
      "resultAccuracy": 60.0,
      "avgAccuracyScore": 54.1
    },
    {
      "model": "google/gemini-2.5",
      "predictions": 25,
      "resultAccuracy": 56.0,
      "avgAccuracyScore": 51.8
    }
  ]
}
```

---

### GET /api/accuracy-stats/calibration

Returns confidence calibration data.

**Response:**
```json
{
  "calibration": [
    {
      "confidenceRange": "80-100%",
      "predictions": 25,
      "expectedAccuracy": 90,
      "actualAccuracy": 76,
      "status": "overconfident",
      "gap": -14
    },
    {
      "confidenceRange": "60-79%",
      "predictions": 60,
      "expectedAccuracy": 70,
      "actualAccuracy": 68,
      "status": "calibrated",
      "gap": -2
    },
    {
      "confidenceRange": "40-59%",
      "predictions": 45,
      "expectedAccuracy": 50,
      "actualAccuracy": 53,
      "status": "calibrated",
      "gap": 3
    },
    {
      "confidenceRange": "0-39%",
      "predictions": 20,
      "expectedAccuracy": 30,
      "actualAccuracy": 35,
      "status": "calibrated",
      "gap": 5
    }
  ],
  "warnings": [
    "High confidence predictions (80%+) are overconfident by 14%"
  ]
}
```

---

## Stats Page (/stats)

The frontend `/stats` page displays accuracy metrics.

### Overview Cards

```
┌────────────────────────────────────────────────────────────────────────┐
│  PREDICTION ACCURACY                                                    │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  Result    │  │  Score     │  │  Over/Under│  │  BTTS      │       │
│  │  61.3%     │  │  12.0%     │  │  58.7%     │  │  62.0%     │       │
│  │  92/150    │  │  18/150    │  │  88/150    │  │  93/150    │       │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘       │
│                                                                         │
│  Average Accuracy Score: 55.2 / 100                                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Model Comparison Chart

```
Model Performance (Result Accuracy)

GPT-4o        ████████████████████░░░░░ 64.4%
GPT-5-mini    ███████████████████░░░░░░ 60.0%
Gemini 2.5    ████████████████░░░░░░░░░ 56.0%
              0%              50%        100%
```

### Calibration Chart

```
Confidence Calibration

Expected ━━━
Actual   ┅┅┅

100% ┤
     │         ━━━━
 75% ┤         ┅┅┅┅
     │    ━━━━
 50% ┤    ┅┅┅┅         ━━━━
     │              ┅┅┅┅
 25% ┤                      ━━━━
     │                      ┅┅┅┅
  0% ┼────┬────┬────┬────┬────┬
     0-39 40-59 60-79 80-100
           Confidence %

⚠️ Warning: High confidence (80%+) is overconfident by 14%
```

---

## Calibration Warnings

The system detects and warns about calibration issues:

| Issue | Detection | Warning |
|-------|-----------|---------|
| **Overconfidence** | Actual < Expected by >10% | "High confidence predictions are overconfident" |
| **Underconfidence** | Actual > Expected by >10% | "Low confidence predictions are underconfident" |
| **Low Volume** | <10 predictions in range | "Insufficient data for reliable calibration" |

---

## Score Index vs Confidence

**Important Distinction:**

| Metric | Scale | Meaning |
|--------|-------|---------|
| **Score Index (Overall Index)** | 1-100 | Which team is favored. >50 = home, <50 = away |
| **Confidence %** | 0-100% | How confident the AI is in the prediction |

**Example:**
- Score Index: 65 → Home team is favored
- Confidence: 72% → AI is 72% confident this prediction is correct

You can have:
- High Score Index (80) + Low Confidence (45%) → Home heavily favored but unpredictable match
- Low Score Index (35) + High Confidence (85%) → Away favored with high certainty

---

## Factor Accuracy Tracking

The system also tracks accuracy per factor across all predictions.

### Per-Factor Accuracy

```json
{
  "factorAccuracy": {
    "A_base_strength": { "accurate": 78, "total": 120, "pct": 65.0 },
    "B_form": { "accurate": 85, "total": 120, "pct": 70.8 },
    "C_key_players": { "accurate": 62, "total": 120, "pct": 51.7 },
    "D_tactical": { "accurate": 70, "total": 120, "pct": 58.3 },
    "E_table_position": { "accurate": 80, "total": 120, "pct": 66.7 },
    "F_h2h": { "accurate": 75, "total": 120, "pct": 62.5 }
  }
}
```

### Insights

- **Factor B (Form)** has highest accuracy → Trust recent form analysis
- **Factor C (Key Players)** has lowest accuracy → Injury impact often unpredictable
- **Factor D (Tactical)** moderate accuracy → Tactical predictions are hit-or-miss

---

## Per-Team Accuracy

Track which teams are most/least predictable.

### Most Predictable Teams

| Team | Predictions | Result Accuracy |
|------|-------------|-----------------|
| Manchester City | 15 | 80% |
| Liverpool | 14 | 71% |
| Arsenal | 13 | 69% |

### Least Predictable Teams

| Team | Predictions | Result Accuracy |
|------|-------------|-----------------|
| Wolverhampton | 12 | 42% |
| Brentford | 11 | 45% |
| Crystal Palace | 10 | 50% |

---

## Time-Based Trends

Track accuracy over time to identify:
- Improvement/decline in model performance
- Seasonal patterns
- Effect of model updates

```
Monthly Result Accuracy

Aug: ███████████████░░░░░ 60%
Sep: ████████████████░░░░ 64%
Oct: ███████████████████░ 68%
Nov: █████████████████░░░ 65%
Dec: ████████████████░░░░ 62%
Jan: ███████████████░░░░░ 59%
```

---

## Database Queries

### Overall Accuracy Query

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN prediction_correct THEN 1 ELSE 0 END) as correct,
  AVG(accuracy_score) as avg_score
FROM match_analysis
WHERE created_at > NOW() - INTERVAL '90 days';
```

### Model Comparison Query

```sql
SELECT
  p.model_version,
  COUNT(*) as predictions,
  AVG(CASE WHEN ma.prediction_correct THEN 100 ELSE 0 END) as accuracy
FROM predictions p
JOIN match_analysis ma ON p.fixture_id = ma.fixture_id
GROUP BY p.model_version
ORDER BY accuracy DESC;
```

### Calibration Query

```sql
SELECT
  CASE
    WHEN confidence_pct >= 80 THEN '80-100%'
    WHEN confidence_pct >= 60 THEN '60-79%'
    WHEN confidence_pct >= 40 THEN '40-59%'
    ELSE '0-39%'
  END as confidence_range,
  COUNT(*) as predictions,
  AVG(CASE WHEN prediction_correct THEN 100 ELSE 0 END) as actual_accuracy
FROM match_analysis
GROUP BY confidence_range
ORDER BY confidence_range DESC;
```

---

## Related Documentation

- [PREDICTION_SYSTEM.md](./PREDICTION_SYSTEM.md) - How predictions are generated
- [MATCH_ANALYSIS.md](./MATCH_ANALYSIS.md) - Post-match analysis
- [FACTORS.md](./FACTORS.md) - 6-factor analysis system
- [DATABASE.md](./DATABASE.md) - Table schemas
