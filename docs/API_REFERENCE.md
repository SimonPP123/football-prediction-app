# API Reference

*Last Updated: January 2, 2026*

---

## Overview

The Football Prediction System exposes **58+ API endpoints** organized into 6 categories. All endpoints are Next.js API routes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          API ARCHITECTURE                                │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        AUTHENTICATION                               │ │
│  │  Cookie: football_auth (7-day expiry)                              │ │
│  │  Admin Header: X-API-Key (for automation/cron)                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   PUBLIC     │  │   DATA       │  │ PREDICTIONS  │                   │
│  │   DATA (12)  │  │ REFRESH (22) │  │     (6)      │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ AUTOMATION   │  │    ADMIN     │  │    AUTH      │                   │
│  │     (4)      │  │     (5)      │  │     (3)      │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication

### Cookie-Based Auth

All authenticated endpoints require the `football_auth` cookie set on login.

```json
{
  "userId": "uuid",
  "username": "admin",
  "isAdmin": true,
  "loginTime": 1704067200000
}
```

### API Key Auth

For automation/cron, pass the admin API key in the `X-API-Key` header:

```bash
curl -X POST \
  -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  https://football.analyserinsights.com/api/automation/trigger
```

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (no auth) |
| 403 | Forbidden (not admin) |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

---

## Public Data Endpoints

Endpoints for reading match and team data. Require authentication.

### GET /api/fixtures/upcoming

Get upcoming fixtures.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `league_id` | UUID | Filter by league |
| `limit` | number | Max results (default: 20) |

**Response:**
```json
{
  "fixtures": [
    {
      "id": "uuid",
      "match_date": "2026-01-05T15:00:00Z",
      "status": "NS",
      "home_team": { "id": "uuid", "name": "Liverpool" },
      "away_team": { "id": "uuid", "name": "Arsenal" },
      "venue": { "name": "Anfield" }
    }
  ]
}
```

---

### GET /api/fixtures/live

Get currently live matches.

**Response:**
```json
{
  "fixtures": [
    {
      "id": "uuid",
      "status": "1H",
      "elapsed": 35,
      "goals_home": 1,
      "goals_away": 0
    }
  ]
}
```

---

### GET /api/fixtures/recent-results

Get recently completed matches.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max results (default: 20) |

---

### GET /api/fixtures/[id]

Get single fixture with full details.

**Response:**
```json
{
  "fixture": {
    "id": "uuid",
    "match_date": "...",
    "home_team": { ... },
    "away_team": { ... },
    "statistics": [ ... ],
    "events": [ ... ],
    "lineups": [ ... ],
    "prediction": { ... },
    "analysis": { ... }
  }
}
```

---

### GET /api/standings

Get current league standings.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `league_id` | UUID | Filter by league |

---

### GET /api/teams

Get all teams.

---

### GET /api/teams/[id]

Get single team with stats.

---

### GET /api/injuries

Get current injuries.

---

### GET /api/leagues

Get all leagues.

---

### GET /api/predictions

Get predictions for upcoming fixtures.

---

### GET /api/predictions/history

Get historical predictions with accuracy.

---

## Data Refresh Endpoints

**Auth Required:** Admin only (cookie or API key)

All refresh endpoints support these query parameters:

| Param | Type | Description |
|-------|------|-------------|
| `league_id` | UUID | Target league |
| `mode` | string | Refresh mode (varies by endpoint) |

---

### POST /api/data/refresh/phase

**Orchestrates multiple refreshes based on match phase.**

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `phase` | string | `pre-match`, `imminent`, `live`, `post-match` |
| `include_optional` | boolean | Include optional endpoints |
| `dry_run` | boolean | Preview without executing |

**Phase Endpoints:**

| Phase | Required Endpoints | Optional |
|-------|-------------------|----------|
| `pre-match` | fixtures, standings, injuries, teams, team-stats | head-to-head, weather, player-stats |
| `imminent` | lineups, odds, injuries | weather |
| `live` | fixtures, fixture-statistics, fixture-events | |
| `post-match` | fixtures, fixture-statistics, fixture-events, standings, team-stats, player-stats, top-performers | lineups |

**Response:**
```json
{
  "success": true,
  "league": "Premier League",
  "phase": "pre-match",
  "summary": {
    "total": 6,
    "successful": 6,
    "failed": 0,
    "duration": 12500
  },
  "results": [
    { "endpoint": "fixtures", "success": true, "duration": 2100 }
  ]
}
```

---

### POST /api/data/refresh/smart

**Intelligently determines what data is stale and refreshes it.**

Analyzes fixture schedule and data freshness to decide which endpoints need refreshing.

---

### POST /api/data/refresh/fixtures

Refresh fixture schedule and scores.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `mode` | string | `next`, `last`, `live`, `smart` |
| `count` | number | Number of fixtures |

---

### POST /api/data/refresh/standings

Refresh league standings.

---

### POST /api/data/refresh/teams

Refresh team data.

---

### POST /api/data/refresh/injuries

Refresh current injuries.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `mode` | string | `upcoming`, `all` |

---

### POST /api/data/refresh/lineups

Refresh match lineups.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `mode` | string | `prematch` |

**Note:** Lineups only available ~1 hour before kickoff.

---

### POST /api/data/refresh/odds

Refresh betting odds from The Odds API.

---

### POST /api/data/refresh/weather

Refresh weather forecasts from Open-Meteo.

---

### POST /api/data/refresh/team-stats

Refresh team season statistics.

---

### POST /api/data/refresh/fixture-statistics

Refresh per-match statistics.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `mode` | string | `smart`, `live` |

---

### POST /api/data/refresh/fixture-events

Refresh match events (goals, cards, subs).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `mode` | string | `smart`, `live` |

---

### POST /api/data/refresh/post-match

Refresh all post-match data for completed fixtures.

---

### POST /api/data/refresh/pre-match

Refresh all pre-match data for upcoming fixtures.

---

### POST /api/data/refresh/head-to-head

Refresh head-to-head history.

---

### POST /api/data/refresh/referee-stats

Refresh referee statistics.

---

### POST /api/data/refresh/coaches

Refresh coach data.

---

### POST /api/data/refresh/transfers

Refresh transfer data.

---

### POST /api/data/refresh/player-squads

Refresh team squad lists.

---

### POST /api/data/refresh/player-stats

Refresh individual player statistics.

---

### POST /api/data/refresh/top-performers

Refresh top scorers and assist leaders.

---

### POST /api/data/refresh/weekly-maintenance

Run weekly maintenance tasks (team stats, squads).

---

### POST /api/data/refresh/season-setup

Initial season data setup.

---

### GET /api/data/status

Get data freshness status.

**Response:**
```json
{
  "categories": {
    "fixtures": { "lastUpdated": "2026-01-02T10:00:00Z", "count": 380 },
    "standings": { "lastUpdated": "2026-01-02T06:00:00Z", "count": 20 },
    "injuries": { "lastUpdated": "2026-01-02T07:30:00Z", "count": 45 }
  }
}
```

---

## Prediction Endpoints

### POST /api/predictions/generate

Generate AI prediction for a fixture.

**Auth:** Any authenticated user

**Request Body:**
```json
{
  "fixture_id": "uuid",
  "model": "openai/gpt-5-mini",
  "custom_prompt": "Focus on defensive matchup"
}
```

**Models:**
- `openai/gpt-4o` - High quality (default)
- `openai/gpt-5-mini` - Fast, cost-effective
- `google/gemini-2.5` - Alternative provider

**Response:**
```json
{
  "success": true,
  "prediction": {
    "id": "uuid",
    "prediction": "1",
    "overall_index": 65,
    "confidence_pct": 72,
    "factors": { ... },
    "analysis": "..."
  }
}
```

---

### POST /api/match-analysis/generate

Generate post-match AI analysis.

**Request Body:**
```json
{
  "fixture_id": "uuid",
  "model": "openai/gpt-5-mini"
}
```

---

### GET /api/match-analysis/[fixture_id]

Get existing match analysis.

---

### POST /api/match-analysis/auto-trigger

Cron endpoint to auto-generate analyses for recent matches.

---

### GET /api/accuracy-stats

Get overall prediction accuracy statistics.

---

### GET /api/accuracy-stats/by-model

Get accuracy broken down by AI model.

---

### GET /api/accuracy-stats/calibration

Get confidence calibration data.

---

## Automation Endpoints

### POST /api/automation/trigger

Main trigger called by cron every 5 minutes.

**Auth:** Admin API key required

**Response:**
```json
{
  "success": true,
  "cronRunId": "uuid",
  "timestamp": "2026-01-02T12:00:00Z",
  "summary": {
    "pre_match": { "checked": 2, "triggered": 2, "errors": 0 },
    "prediction": { "checked": 1, "triggered": 1, "errors": 0 },
    "live": { "checked": 0, "triggered": 0, "errors": 0 },
    "post_match": { "checked": 0, "triggered": 0, "errors": 0 },
    "analysis": { "checked": 0, "triggered": 0, "errors": 0 }
  }
}
```

---

### GET /api/automation/status

Get automation system status.

**Response:**
```json
{
  "isEnabled": true,
  "lastCronRun": "2026-01-02T12:00:00Z",
  "lastCronStatus": "success",
  "nextCronRun": "2026-01-02T12:05:00Z",
  "triggers": {
    "preMatch": { "successToday": 5, "errorToday": 0, "lastTriggered": "..." },
    "prediction": { ... },
    "live": { ... },
    "postMatch": { ... },
    "analysis": { ... }
  },
  "errorsToday": 0
}
```

---

### PATCH /api/automation/status

Update automation configuration.

**Request Body:**
```json
{
  "is_enabled": true,
  "pre_match_enabled": true,
  "prediction_enabled": true,
  "live_enabled": true,
  "post_match_enabled": true,
  "analysis_enabled": true
}
```

---

### GET /api/automation/logs

Get automation event logs.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max logs (default: 50) |
| `trigger_type` | string | Filter by type |
| `status` | string | Filter by status |
| `date` | string | Filter by date (YYYY-MM-DD) |

---

### GET /api/automation/webhooks

Get webhook configuration.

**Auth Required:** Admin only

**Response:**
```json
{
  "prediction_webhook_url": "https://nn.analyserinsights.com/webhook/football-prediction",
  "analysis_webhook_url": "https://nn.analyserinsights.com/webhook/post-match-analysis",
  "pre_match_webhook_url": "https://nn.analyserinsights.com/webhook/trigger/pre-match",
  "live_webhook_url": "https://nn.analyserinsights.com/webhook/trigger/live",
  "post_match_webhook_url": "https://nn.analyserinsights.com/webhook/trigger/post-match",
  "webhook_secret_set": true,
  "is_custom": {
    "prediction": false,
    "analysis": false,
    "pre_match": false,
    "live": false,
    "post_match": false
  },
  "defaults": {
    "prediction": "https://nn.analyserinsights.com/webhook/football-prediction",
    "analysis": "https://nn.analyserinsights.com/webhook/post-match-analysis",
    "preMatch": "https://nn.analyserinsights.com/webhook/trigger/pre-match",
    "live": "https://nn.analyserinsights.com/webhook/trigger/live",
    "postMatch": "https://nn.analyserinsights.com/webhook/trigger/post-match"
  }
}
```

---

### PATCH /api/automation/webhooks

Update webhook URLs.

**Auth Required:** Admin only

**Request Body:**
```json
{
  "prediction_webhook_url": "https://custom.url/prediction",
  "analysis_webhook_url": "https://custom.url/analysis",
  "pre_match_webhook_url": "https://custom.url/pre-match",
  "live_webhook_url": "https://custom.url/live",
  "post_match_webhook_url": "https://custom.url/post-match"
}
```

**Notes:**
- All fields are optional. Only include fields you want to update.
- Set a field to `null` to reset to the default URL.
- URLs must be valid HTTP/HTTPS format.
- The `webhook_secret` is **NOT configurable via API** - it must be set via the `N8N_WEBHOOK_SECRET` environment variable.

**Response:**
```json
{
  "success": true,
  "message": "Webhook configuration updated",
  "config": {
    "prediction_webhook_url": "https://custom.url/prediction",
    "webhook_secret_set": true
  }
}
```

---

## Admin Endpoints

**Auth Required:** Admin only

### GET /api/admin/users

List all users.

---

### POST /api/admin/users

Create new user.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword",
  "is_admin": false
}
```

---

### GET /api/admin/users/[id]

Get single user.

---

### PATCH /api/admin/users/[id]

Update user.

**Request Body:**
```json
{
  "is_active": true,
  "is_admin": false
}
```

---

### DELETE /api/admin/users/[id]

Delete user.

---

### GET /api/admin/leagues

List leagues with settings.

---

### POST /api/admin/leagues

Add new league.

---

### PATCH /api/admin/leagues

Update league settings.

---

## Auth Endpoints

### POST /api/auth/login

Authenticate user.

**Request Body:**
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "isAdmin": true
  }
}
```

Sets `football_auth` cookie (7-day expiry).

---

### POST /api/auth/logout

Clear authentication cookie.

---

### GET /api/auth/me

Get current authenticated user.

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "isAdmin": true
  }
}
```

---

## Updates & History

### GET /api/updates/status

Get update/activity status.

---

### GET /api/updates/history

Get update history.

---

## Common Response Patterns

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

### Refresh Response

```json
{
  "success": true,
  "refreshed": 10,
  "duration": 2500,
  "details": { ... }
}
```

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Auth (login) | 5 attempts per 15 min per IP |
| Data Refresh | No limit (admin only) |
| Predictions | No limit (webhook timeout 60s) |

---

## Related Documentation

- [AUTOMATION.md](./AUTOMATION.md) - Automation system
- [DATA_REFRESH.md](./DATA_REFRESH.md) - Refresh system details
- [DATABASE.md](./DATABASE.md) - Database schema
