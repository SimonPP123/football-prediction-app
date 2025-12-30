# Football Prediction System - Owner's Reference Guide
*Last Updated: December 30, 2025*

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [External Dependencies & Rate Limits](#external-dependencies--rate-limits)
4. [User Roles & Access](#user-roles--access)
5. [Data Flow & Sync Schedule](#data-flow--sync-schedule)
6. [Critical Failure Points](#critical-failure-points)
7. [Known Limitations](#known-limitations)
8. [Operational Checklist](#operational-checklist)

---

## System Overview

The Football Prediction System is an AI-powered application for generating match predictions for Premier League fixtures. It uses a 6-factor analysis model processed by GPT-4o/Gemini via n8n workflows.

### Core Features
| Feature | Description |
|---------|-------------|
| **AI Predictions** | Match outcome (1X2), exact score, Over/Under 2.5, BTTS |
| **Factor Analysis** | 6-factor weighted model (Base Strength, Form, Key Players, Tactical, Table Position, H2H) |
| **Post-Match Analysis** | AI-generated review comparing prediction vs actual result |
| **Live Data** | Real-time scores, standings, odds, weather, injuries |
| **Multi-Model Support** | OpenAI GPT-4o/5-mini, Google Gemini 2.5 |

### Production Deployment
- **URL**: https://football.analyserinsights.com
- **Server**: Hetzner VM (91.99.217.15)
- **Process Manager**: PM2 (`football-prediction`)
- **Port**: 3004 (Caddy reverse proxy)

---

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 14.2 (App Router)
- **UI**: React 18.3 + Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **API Routes**: Next.js Server Components
- **Database**: Supabase PostgreSQL
- **Auth**: Cookie-based (football_auth, 7-day expiry)
- **Password Hashing**: bcryptjs (cost factor 10)

### External Services
| Service | Purpose | Critical? |
|---------|---------|-----------|
| **Supabase** | Database & storage | YES |
| **API-Football** | Match data, stats, lineups | YES |
| **The Odds API** | Betting odds | NO (feature only) |
| **n8n** | AI workflow orchestration | YES |
| **Open-Meteo** | Weather data | NO (free, unlimited) |

### Database Tables (15 core)
- `fixtures`, `teams`, `standings`, `predictions`, `match_analysis`
- `fixture_statistics`, `fixture_events`, `lineups`, `injuries`
- `odds`, `weather`, `head_to_head`, `users`, `leagues`, `venues`

---

## External Dependencies & Rate Limits

### API-Football (Primary Data Source)
- **Base URL**: `https://v3.football.api-sports.io`
- **Auth**: Header (`x-apisports-key`)
- **Rate Limit**: Daily quota (check header `x-ratelimit-requests-remaining`)
- **Key Endpoints**:
  - `/fixtures` - Match schedule
  - `/fixtures/statistics` - Post-match stats
  - `/fixtures/lineups` - Available ~1hr before kickoff
  - `/standings` - League table
  - `/injuries` - Injury list

**Warning**: No circuit breaker implemented. If API is down, all data sync fails.

### The Odds API
- **Base URL**: `https://api.the-odds-api.com/v4`
- **Auth**: Query param (`apiKey`)
- **Rate Limit**: **500 requests/month** (free tier)
- **Usage**: ~12-15 calls/month if refreshed daily
- **Sport Key**: `soccer_epl`

**Warning**: Monthly quota can be exhausted. No alerting when low.

### n8n (AI Orchestration)
- **URL**: `https://nn.analyserinsights.com/`
- **Prediction Webhook**: `/webhook/football-prediction`
- **Analysis Webhook**: `/webhook/post-match-analysis`
- **Rate Limit**: 2-second delay between requests (self-imposed)

**Warning**: Single point of failure. If n8n is down, NO predictions can be generated.

### Open-Meteo (Weather)
- **URL**: `https://api.open-meteo.com/v1/forecast`
- **Auth**: None required
- **Rate Limit**: Unlimited (free tier)

---

## User Roles & Access

### Regular User
- View all data (predictions, matches, standings, teams, stats)
- Generate predictions for fixtures
- Trigger post-match analysis
- Cannot access admin features

### Admin User
- All regular user capabilities
- User management (create, edit, delete, toggle status)
- League configuration
- Data refresh triggers

### Protected Routes
| Route | Access |
|-------|--------|
| `/login` | Public |
| `/`, `/predictions`, `/matches/*`, `/standings`, `/teams/*`, `/stats` | Authenticated |
| `/admin/*`, `/api/admin/*` | Admin only |
| `/api/data/refresh/*` | Requires auth (middleware) |

---

## Data Flow & Sync Schedule

### Automated Sync (via n8n)
| Data | Schedule | Notes |
|------|----------|-------|
| Standings | Daily 06:00 UTC | League table |
| Fixtures | Daily 06:15 UTC | Match schedule |
| Injuries | Daily 07:30 UTC | Current injuries |
| Completed Matches | Daily 08:00 UTC | Results + stats |
| Weather | Daily 09:00 UTC | Match forecasts |
| Odds | Every 4 hours (matchday) | Betting data |
| Lineups | ~1hr before kickoff | Starting XI |
| Team Stats | Weekly Sunday 05:00 | Aggregated stats |

### Vercel Cron Job
```
/api/match-analysis/auto-trigger - Every 2 hours
```
- Finds matches completed 1-7 hours ago
- Triggers AI analysis for those without existing analysis

### Prediction Generation Flow
1. User clicks "Generate Prediction" on `/predictions`
2. API fetches fixture + recent analyses (memory context)
3. POST to n8n webhook with all context
4. n8n AI generates prediction (5-15 seconds)
5. Response saved to database
6. Frontend polls and displays result

---

## Critical Failure Points

### 1. n8n Unavailable
**Impact**: ALL predictions fail
**Symptoms**: Prediction generation hangs then errors
**Resolution**: Check n8n service status, restart if needed
**Prevention**: None currently (single point of failure)

### 2. API-Football Down/Rate Limited
**Impact**: No new data syncs
**Symptoms**: Stale data, "Data freshness" shows old timestamps
**Resolution**: Wait for API recovery, check remaining quota
**Prevention**: Monitor `x-ratelimit-requests-remaining` header

### 3. The Odds API Quota Exhausted
**Impact**: No odds updates for remainder of month
**Symptoms**: Odds tab shows stale data or empty
**Resolution**: Upgrade subscription or wait for quota reset
**Prevention**: Currently none - needs alerting

### 4. Supabase Outage
**Impact**: Entire application non-functional
**Symptoms**: 500 errors everywhere
**Resolution**: Check Supabase status page

### 5. Webhook Timeout
**Impact**: Prediction generation fails silently
**Symptoms**: User sees "generating..." forever
**Resolution**: Check n8n logs, may need retry
**Prevention**: Need retry logic implementation

---

## Known Limitations

### Data Availability
| Data | Limitation |
|------|------------|
| **Lineups** | Only available ~1 hour before kickoff |
| **xG Data** | May be null for some matches |
| **Weather** | Requires venue lat/lng coordinates |
| **H2H** | Only for Premier League teams |
| **Referee Stats** | Limited historical data |

### Feature Limitations
| Feature | Limitation |
|---------|------------|
| **Prediction Retry** | No automatic retry if n8n fails |
| **Offline Mode** | No cached data when offline |
| **Pagination** | All data loaded at once (no lazy loading) |
| **Multi-League** | Only Premier League active currently |
| **Real-time Updates** | Manual refresh required |

### Performance Considerations
- Large data fetches (50+ fixtures) can be slow
- No server-side filtering on standings/teams pages
- N+1 query pattern in some team detail pages

---

## Operational Checklist

### Daily Checks
- [ ] Verify n8n workflows are running (check n8n dashboard)
- [ ] Check data freshness badges on dashboard
- [ ] Review PM2 status: `pm2 status football-prediction`

### Weekly Checks
- [ ] Review error logs: `pm2 logs football-prediction --lines 200`
- [ ] Check API-Football remaining quota
- [ ] Verify The Odds API usage (500/month limit)
- [ ] Test prediction generation manually

### Monthly Checks
- [ ] Review accuracy statistics on `/stats`
- [ ] Check Supabase database size
- [ ] Rotate admin password if needed
- [ ] Review user activity logs

### Before Match Days
- [ ] Ensure lineups sync is scheduled
- [ ] Verify odds are updating
- [ ] Check weather data is available for venues

### Emergency Procedures

**If predictions aren't generating:**
1. Check n8n webhook status
2. Check Supabase connectivity
3. Review browser console for errors
4. Check PM2 logs for API errors

**If data is stale:**
1. Check n8n scheduled workflows
2. Manually trigger `/api/data/refresh/[category]`
3. Check API-Football rate limit status

**If site is down:**
1. SSH into VM: `ssh -i ~/.ssh/hetzner_dify_key simeon_penew@91.99.217.15`
2. Check PM2: `pm2 status`
3. Restart if needed: `pm2 restart football-prediction`
4. Check Caddy: `systemctl status caddy`

---

## Quick Reference

### Environment Variables (Required)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
API_FOOTBALL_KEY
ODDS_API_KEY
N8N_PREDICTION_WEBHOOK
N8N_ANALYSIS_WEBHOOK
PREMIER_LEAGUE_ID=39
CURRENT_SEASON=2025
```

### Key File Locations
```
/app/api/predictions/generate/route.ts    # Prediction API
/app/api/match-analysis/auto-trigger/      # Auto-analysis cron
/middleware.ts                             # Auth middleware
/lib/supabase/queries.ts                   # Database queries
/supabase/migrations/                      # DB schema
```

### Deployment Command
```bash
ssh -i ~/.ssh/hetzner_dify_key simeon_penew@91.99.217.15 \
  "cd /var/www/football-prediction && git pull && rm -rf .next && npm run build && pm2 restart football-prediction"
```

---

## Summary: What Can Break

| Risk Level | Issue | User Impact |
|------------|-------|-------------|
| **CRITICAL** | n8n down | No predictions at all |
| **CRITICAL** | Supabase down | Site non-functional |
| **HIGH** | API-Football rate limited | Stale match data |
| **HIGH** | The Odds API quota exhausted | No odds for rest of month |
| **MEDIUM** | Weather API issues | Missing weather data |
| **MEDIUM** | Webhook timeout | Individual predictions fail |
| **LOW** | Slow data sync | Brief stale data periods |

**The #1 risk is n8n being unavailable** - there is no fallback for prediction generation.
