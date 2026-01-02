# Data Refresh System

*Last Updated: January 2, 2026*

---

## Overview

The Data Refresh System keeps football data synchronized through **three mechanisms**: Phase-Based Refresh, Smart Refresh, and Manual Refresh.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATA REFRESH ARCHITECTURE                          │
│                                                                          │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│   │  PHASE-BASED    │    │  SMART REFRESH  │    │ MANUAL REFRESH  │    │
│   │                 │    │                 │    │                 │    │
│   │  - pre-match    │    │  Auto-detects   │    │  /data page UI  │    │
│   │  - imminent     │    │  stale data     │    │  Click buttons  │    │
│   │  - live         │    │  and refreshes  │    │  to refresh     │    │
│   │  - post-match   │    │  what's needed  │    │  specific data  │    │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    │
│            │                      │                      │              │
│            └──────────────────────┼──────────────────────┘              │
│                                   │                                      │
│                                   ▼                                      │
│                    ┌──────────────────────────────┐                     │
│                    │       refresh_logs table      │                     │
│                    │   (Activity page monitoring)  │                     │
│                    └──────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase-Based Refresh

The phase-based system orchestrates multiple endpoint refreshes based on the current match phase.

### Match Phases

| Phase | When | Purpose |
|-------|------|---------|
| **pre-match** | 1+ days before matches | Prepare core data |
| **imminent** | 0-2 hours before kickoff | Get lineups, final odds |
| **live** | During matches | Real-time updates |
| **post-match** | 0-24 hours after FT | Complete match data |

### Phase Timeline Example

```
                    Match: Liverpool vs Arsenal @ 15:00

Day Before (pre-match)
├── 06:00  standings         ─┐
├── 06:15  fixtures           │ Core data
├── 07:00  team-stats         │ for upcoming
├── 07:30  injuries          ─┘ matches
└── 09:00  weather

Matchday Morning (pre-match)
├── 08:00  standings refresh
└── 08:30  injuries refresh

1-2 Hours Before (imminent)
├── 13:00  odds final
├── 14:00  LINEUPS AVAILABLE  ◄── Key moment
└── 14:30  injuries final

During Match (live)
├── 15:00  KICKOFF
├── 15:05  fixture status + events
├── 15:10  fixture status + events
├── ...    (every 5 min via automation)
└── 16:50  FULL TIME

Post-Match (post-match)
├── 17:00  final score
├── 17:30  match statistics
├── 18:00  match events
├── 21:00  standings update     ◄── 6h after for full stats
└── 21:15  AI analysis generated
```

### Endpoints Per Phase

#### Pre-Match Phase
```
POST /api/data/refresh/phase?phase=pre-match

Required (5 endpoints):
├── fixtures?mode=next&count=10   # Upcoming matches
├── standings                      # League table
├── injuries?mode=upcoming         # Current injuries
├── teams                          # Team data
└── team-stats                     # Season statistics

Optional:
├── head-to-head                   # H2H history
├── weather                        # Match forecasts
└── player-stats                   # Player data
```

#### Imminent Phase
```
POST /api/data/refresh/phase?phase=imminent

Required:
├── lineups?mode=prematch          # Starting XI (only ~1hr before)
├── odds                           # Final odds
└── injuries?mode=upcoming         # Last-minute changes

Optional:
└── weather                        # Final forecast
```

#### Live Phase
```
POST /api/data/refresh/phase?phase=live

Required:
├── fixtures?mode=live             # Live scores & status
├── fixture-statistics?mode=live   # Real-time stats
└── fixture-events?mode=live       # Goals, cards, subs
```

#### Post-Match Phase
```
POST /api/data/refresh/phase?phase=post-match

Required:
├── fixtures?mode=last&count=20    # Final scores
├── fixture-statistics?mode=smart  # Full match statistics
├── fixture-events?mode=smart      # All match events
├── standings                      # Updated table
├── team-stats                     # Updated team stats
├── player-stats                   # Updated player stats
└── top-performers                 # Scorers, assists

Optional:
└── lineups                        # Confirm lineups
```

---

## Smart Refresh

The Smart Refresh analyzes current fixture schedule and data freshness to automatically determine what needs refreshing.

### How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    SMART REFRESH LOGIC                            │
│                                                                   │
│  1. Detect Current Phase                                         │
│     └── Check fixtures table for match timing                    │
│                                                                   │
│  2. Analyze Data Freshness                                       │
│     └── Compare last_updated timestamps vs thresholds            │
│                                                                   │
│  3. Build Refresh Plan                                           │
│     └── Include only stale endpoints                             │
│                                                                   │
│  4. Execute Refreshes                                            │
│     └── Run endpoints in parallel                                │
│                                                                   │
│  5. Log Results                                                  │
│     └── Write to refresh_logs table                              │
└──────────────────────────────────────────────────────────────────┘
```

### Freshness Thresholds

| Data Type | Stale After | Notes |
|-----------|-------------|-------|
| Fixtures | 6 hours | Basic schedule |
| Standings | 12 hours | Daily update |
| Injuries | 12 hours | Can change frequently |
| Lineups | 2 hours | Only before matches |
| Odds | 4 hours | Before matchday |
| Odds | 1 hour | On matchday |
| Weather | 6 hours | Weather forecasts |
| Team Stats | 24 hours | Weekly update OK |

### API Usage

```bash
# Automatic smart refresh
POST /api/data/refresh/smart

# With league filter
POST /api/data/refresh/smart?league_id=UUID
```

---

## Manual Refresh

Users can manually trigger refreshes from the `/data` page.

### Data Page Categories

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Fixtures** | fixtures | Match schedule |
| **Standings** | standings | League table |
| **Team Data** | teams, team-stats | Club info |
| **Injuries** | injuries | Current injuries |
| **Lineups** | lineups | Match lineups |
| **Match Stats** | fixture-statistics, fixture-events | Per-match data |
| **External** | odds, weather | Third-party data |
| **Maintenance** | weekly-maintenance | Full sync |

### Refresh Buttons

Each category on the Data page has:
- **Last Updated** timestamp
- **Refresh** button
- **Status** indicator (success/error)

---

## Automation Integration

The automation system (cron) triggers phase-based refreshes automatically.

### Automation Flow

```
Cron (every 5 min)
       │
       ▼
/api/automation/trigger
       │
       ├── Check pre-match window (28-33 min before)
       │   └── n8n webhook → phase=pre-match + phase=imminent
       │
       ├── Check live matches
       │   └── n8n webhook → phase=live
       │
       └── Check post-match window (6h after)
           └── n8n webhook → phase=post-match
```

See [AUTOMATION.md](./AUTOMATION.md) for full details.

---

## Refresh Logging

All refresh operations are logged to the `refresh_logs` table.

### Log Entry Structure

```json
{
  "id": "uuid",
  "category": "fixtures",
  "type": "refresh",
  "status": "success",
  "message": "Refreshed 10 fixtures",
  "details": {
    "refreshed": 10,
    "duration": 2500
  },
  "league_id": "uuid",
  "created_at": "2026-01-02T10:00:00Z"
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `success` | Refresh completed successfully |
| `error` | Refresh failed |
| `pending` | Refresh in progress |

### Log Cleanup

Logs older than 30 days are automatically deleted (database trigger).

---

## API-Football Rate Limits

Be mindful of API-Football daily quotas when refreshing.

### Request Counts Per Operation

| Operation | Approx Requests |
|-----------|-----------------|
| Phase: pre-match | 5-8 requests |
| Phase: imminent | 3-4 requests |
| Phase: live | 3 requests per match |
| Phase: post-match | 7-8 requests |
| Smart refresh | 3-10 requests |

### Best Practices

1. **Use phase-based refresh** - Groups related endpoints
2. **Check data freshness** - Don't refresh if not needed
3. **Batch operations** - Use mode=smart for bulk
4. **Monitor quota** - Check `x-ratelimit-requests-remaining` header

---

## Troubleshooting

### "Data is stale" on Activity page

1. Check last cron run time
2. Verify automation is enabled
3. Check n8n webhook status
4. Try manual refresh

### "Lineups not available"

- Lineups are only available ~1 hour before kickoff
- Check if fixture is within lineup window
- Verify fixture status is NS (Not Started)

### "Refresh failed" errors

1. Check API-Football quota
2. Verify network connectivity
3. Check Supabase connection
4. Review error logs in refresh_logs

---

## Related Documentation

- [AUTOMATION.md](./AUTOMATION.md) - Automated refresh triggers
- [API_REFERENCE.md](./API_REFERENCE.md) - All refresh endpoints
- [DATABASE.md](./DATABASE.md) - refresh_logs table schema
