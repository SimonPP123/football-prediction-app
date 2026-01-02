# Automation System Documentation

This document describes the automated match processing system that handles data refresh, AI predictions, and post-match analysis.

---

## Overview

The automation system runs on a **5-minute cron interval** and automatically:
1. Refreshes match data before kickoff
2. Generates AI predictions
3. Updates live scores during matches
4. Refreshes post-match statistics
5. Generates AI analysis comparing predictions to results

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AUTOMATION FLOW                                │
│                                                                          │
│   CRON (every 5 min)                                                    │
│         │                                                                │
│         ▼                                                                │
│   /api/automation/trigger                                               │
│         │                                                                │
│         ├──► Check Pre-Match Window ──► n8n: /trigger/pre-match         │
│         ├──► Check Prediction Window ──► /api/predictions/generate      │
│         ├──► Check Live Matches ──► n8n: /trigger/live                  │
│         ├──► Check Post-Match Window ──► n8n: /trigger/post-match       │
│         └──► Check Analysis Window ──► /api/match-analysis/generate     │
│                                                                          │
│   All events logged to: automation_logs table                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Trigger Automation

**Endpoint:** `POST /api/automation/trigger`

**Authentication:** Admin API Key (`X-API-Key` header)

**Description:** Main entry point called by cron. Checks all time windows and triggers appropriate workflows.

**Response:**
```json
{
  "success": true,
  "cronRunId": "uuid",
  "timestamp": "2026-01-02T12:00:00.000Z",
  "duration": 1234,
  "summary": {
    "pre_match": { "checked": 2, "triggered": 2, "errors": 0 },
    "prediction": { "checked": 1, "triggered": 1, "errors": 0 },
    "live": { "checked": 0, "triggered": 0, "errors": 0 },
    "post_match": { "checked": 0, "triggered": 0, "errors": 0 },
    "analysis": { "checked": 0, "triggered": 0, "errors": 0 }
  },
  "results": [
    { "triggerType": "pre-match", "status": "success", "fixtureCount": 2 },
    { "triggerType": "prediction", "status": "success", "fixtureCount": 1 }
  ]
}
```

---

### 2. Get Automation Status

**Endpoint:** `GET /api/automation/status`

**Authentication:** Admin API Key (`X-API-Key` header)

**Description:** Returns current automation status, trigger statistics, and configuration.

**Response:**
```json
{
  "isEnabled": true,
  "lastCronRun": "2026-01-02T12:00:00.000Z",
  "lastCronStatus": "success",
  "nextCronRun": "2026-01-02T12:05:00.000Z",
  "triggers": {
    "preMatch": {
      "successToday": 5,
      "errorToday": 0,
      "lastTriggered": "2026-01-02T11:30:00.000Z",
      "enabled": true
    },
    "prediction": { ... },
    "live": { ... },
    "postMatch": { ... },
    "analysis": { ... }
  },
  "errorsToday": 0,
  "config": {
    "pre_match_enabled": true,
    "prediction_enabled": true,
    "live_enabled": true,
    "post_match_enabled": true,
    "analysis_enabled": true,
    "pre_match_minutes_before": 30,
    "prediction_minutes_before": 25,
    "post_match_hours_after": 6,
    "analysis_hours_after": 6.25
  }
}
```

---

### 3. Update Automation Config

**Endpoint:** `PATCH /api/automation/status`

**Authentication:** Admin API Key (`X-API-Key` header)

**Description:** Update automation settings (enable/disable, timing, etc.)

**Request Body:**
```json
{
  "is_enabled": true,
  "pre_match_enabled": true,
  "prediction_enabled": true,
  "live_enabled": true,
  "post_match_enabled": true,
  "analysis_enabled": true,
  "pre_match_minutes_before": 30,
  "prediction_minutes_before": 25,
  "post_match_hours_after": 6,
  "analysis_hours_after": 6.25
}
```

**Response:**
```json
{
  "success": true,
  "message": "Automation config updated",
  "config": { ... }
}
```

---

### 4. Get Automation Logs

**Endpoint:** `GET /api/automation/logs`

**Authentication:** Admin API Key (`X-API-Key` header)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max logs to return (default: 50) |
| `trigger_type` | string | Filter by type: `pre-match`, `prediction`, `live`, `post-match`, `analysis` |
| `status` | string | Filter by status: `success`, `error`, `no-action`, `skipped` |
| `date` | string | Filter by date (YYYY-MM-DD) |

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "trigger_type": "pre-match",
      "cron_run_id": "uuid",
      "league_id": "uuid",
      "fixture_ids": ["uuid1", "uuid2"],
      "fixture_count": 2,
      "webhook_url": "https://nn.analyserinsights.com/webhook/trigger/pre-match",
      "webhook_status": 200,
      "webhook_duration_ms": 1234,
      "status": "success",
      "message": "Triggered pre-match for 2 fixtures in Premier League",
      "triggered_at": "2026-01-02T12:00:00.000Z",
      "details": { ... }
    }
  ]
}
```

---

## Database Schema

### Table: `automation_config`

Stores global automation settings.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | auto | Primary key |
| `is_enabled` | boolean | true | Master on/off switch |
| `last_cron_run` | timestamp | null | Last cron execution time |
| `last_cron_status` | text | null | `success`, `error`, `running` |
| `pre_match_enabled` | boolean | true | Enable pre-match trigger |
| `prediction_enabled` | boolean | true | Enable prediction trigger |
| `live_enabled` | boolean | true | Enable live trigger |
| `post_match_enabled` | boolean | true | Enable post-match trigger |
| `analysis_enabled` | boolean | true | Enable analysis trigger |
| `pre_match_minutes_before` | integer | 30 | Minutes before kickoff |
| `prediction_minutes_before` | integer | 25 | Minutes before kickoff |
| `post_match_hours_after` | numeric | 6 | Hours after FT |
| `analysis_hours_after` | numeric | 6.25 | Hours after FT |
| `updated_at` | timestamp | now() | Last config update |

---

### Table: `automation_logs`

Stores all automation events for monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `cron_run_id` | UUID | Groups events from same cron run |
| `trigger_type` | text | `pre-match`, `prediction`, `live`, `post-match`, `analysis`, `cron-check` |
| `league_id` | UUID | League reference (nullable) |
| `fixture_ids` | UUID[] | Array of fixture IDs triggered |
| `fixture_count` | integer | Number of fixtures |
| `webhook_url` | text | n8n webhook URL called |
| `webhook_status` | integer | HTTP status code |
| `webhook_response` | jsonb | Full response from webhook |
| `webhook_duration_ms` | integer | Request duration |
| `status` | text | `success`, `error`, `skipped`, `no-action` |
| `message` | text | Human-readable message |
| `error_message` | text | Error details if failed |
| `triggered_at` | timestamp | When event occurred |
| `completed_at` | timestamp | When event completed |
| `details` | jsonb | Additional context |

---

## Timing Windows

Each trigger has a precise 5-minute window that aligns with the cron interval to ensure **exactly one trigger per fixture**.

| Trigger | Window | Description |
|---------|--------|-------------|
| **Pre-Match** | 28-33 min before kickoff | Refreshes team data, injuries, lineups |
| **Prediction** | 23-28 min before kickoff | Generates AI prediction |
| **Live** | During match (1H, 2H, HT, ET, BT, P) | Updates live scores |
| **Post-Match** | 358-363 min (6h) after FT | Refreshes final stats |
| **Analysis** | 373-378 min (6h 15m) after FT | Generates AI analysis |

### Example Timeline (Match at 15:00)

```
14:27-14:32  │ PRE-MATCH window    │ Cron at 14:30 triggers
14:32-14:37  │ PREDICTION window   │ Cron at 14:35 triggers
15:00        │ KICKOFF             │
15:00-16:45  │ LIVE window         │ Cron triggers every 5 min
16:45        │ FULL TIME           │
22:43-22:48  │ POST-MATCH window   │ Cron at 22:45 triggers
22:58-23:03  │ ANALYSIS window     │ Cron at 23:00 triggers
```

---

## n8n Webhook Endpoints

The automation system calls these n8n webhooks:

### 1. Pre-Match Refresh

**URL:** `https://nn.analyserinsights.com/webhook/trigger/pre-match`

**Payload:**
```json
{
  "league_id": "uuid",
  "league_name": "Premier League",
  "fixtures": [
    {
      "id": "uuid",
      "home_team": "Liverpool",
      "away_team": "Arsenal",
      "match_date": "2026-01-02T15:00:00Z"
    }
  ],
  "trigger_type": "pre-match"
}
```

**n8n Workflow Actions:**
1. Call `POST /api/data/refresh/phase?phase=pre-match&league_id=X`
2. Call `POST /api/data/refresh/phase?phase=imminent&league_id=X`

---

### 2. Live Refresh

**URL:** `https://nn.analyserinsights.com/webhook/trigger/live`

**Payload:**
```json
{
  "leagues": [
    { "league_id": "uuid", "live_count": 3 }
  ],
  "trigger_type": "live"
}
```

**n8n Workflow Actions:**
1. For each league: Call `POST /api/data/refresh/phase?phase=live&league_id=X`

---

### 3. Post-Match Refresh

**URL:** `https://nn.analyserinsights.com/webhook/trigger/post-match`

**Payload:**
```json
{
  "leagues": [
    { "league_id": "uuid", "finished_count": 2 }
  ],
  "trigger_type": "post-match"
}
```

**n8n Workflow Actions:**
1. For each league: Call `POST /api/data/refresh/phase?phase=post-match&league_id=X`

---

## Cron Configuration

### Hetzner VM Setup

**Location:** `/var/www/football-prediction`

**Cron Job:**
```bash
*/5 * * * * curl -s -X POST \
  -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  https://football.analyserinsights.com/api/automation/trigger \
  >> /var/log/football/automation.log 2>&1
```

**Setup Commands:**
```bash
# SSH to server
ssh -i ~/.ssh/hetzner_dify_key simeon_penew@91.99.217.15

# Create log directory
sudo mkdir -p /var/log/football
sudo chown simeon_penew:simeon_penew /var/log/football

# Edit crontab
crontab -e

# Verify cron
crontab -l
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_API_KEY` | Yes | API key for cron authentication |
| `N8N_WEBHOOK_BASE_URL` | Yes | Base URL for n8n webhooks |
| `N8N_WEBHOOK_SECRET` | No | Secret for webhook authentication |
| `NEXT_PUBLIC_BASE_URL` | Yes | App URL for internal API calls |

---

## Activity Page UI

The automation system is monitored via the **Activity** page (`/activity`):

### Automation Tab Features:

1. **Status Panel**
   - Enable/Disable toggle button
   - Last cron run timestamp
   - Next expected run
   - Error count today

2. **Trigger Cards** (5 cards)
   - Success/error count today
   - Last triggered time
   - Enabled status

3. **Logs Section**
   - Timeline of all automation events
   - Expandable details with webhook response
   - Filter by trigger type and status

---

## Troubleshooting

### Common Issues

**1. Automation not running**
- Check if `is_enabled` is true: `GET /api/automation/status`
- Verify cron is running: `crontab -l`
- Check logs: `tail -f /var/log/football/automation.log`

**2. Webhook failures**
- Check n8n workflow is active
- Verify webhook secret matches
- Check automation_logs for error messages

**3. Fixtures not being triggered**
- Verify fixture `match_date` is correct
- Check league `is_active` is true
- Confirm fixture `status` is correct (NS for upcoming, FT for finished)

**4. Duplicate triggers**
- Windows are designed to be 5 min to prevent duplicates
- If duplicates occur, check cron isn't running more frequently

### Useful Commands

```bash
# Check automation status
curl -s -H "X-API-Key: YOUR_KEY" \
  https://football.analyserinsights.com/api/automation/status | jq .

# Manually trigger automation
curl -s -X POST -H "X-API-Key: YOUR_KEY" \
  https://football.analyserinsights.com/api/automation/trigger | jq .

# Disable automation
curl -s -X PATCH -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": false}' \
  https://football.analyserinsights.com/api/automation/status | jq .

# View recent logs
curl -s -H "X-API-Key: YOUR_KEY" \
  "https://football.analyserinsights.com/api/automation/logs?limit=10" | jq .
```

---

## File Reference

| File | Purpose |
|------|---------|
| `app/api/automation/trigger/route.ts` | Main trigger endpoint |
| `app/api/automation/status/route.ts` | Status & config endpoint |
| `app/api/automation/logs/route.ts` | Logs query endpoint |
| `lib/automation/check-windows.ts` | Time window queries |
| `lib/automation/send-webhooks.ts` | Webhook sending & logging |
| `components/activity/automation-status-panel.tsx` | UI status panel |
| `components/activity/automation-logs-section.tsx` | UI logs section |
| `components/activity/trigger-status-card.tsx` | UI trigger cards |
