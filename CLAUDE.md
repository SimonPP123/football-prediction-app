# CLAUDE.md - Football Prediction System

This file provides guidance to Claude Code when working with this Football Prediction project.

## Quick Reference - Credentials & Access

### Supabase
- **URL**: `https://ypddcrvjeeqavqpcypoa.supabase.co`
- **Project ID**: `ypddcrvjeeqavqpcypoa`
- **Dashboard**: https://supabase.com/dashboard/project/ypddcrvjeeqavqpcypoa

### n8n
- **URL**: `https://nn.analyserinsights.com/`
- **API Key**: Stored in `.env.local`

### API-Football
- **Base URL**: `https://v3.football.api-sports.io`
- **Header**: `x-apisports-key: {API_FOOTBALL_KEY}`
- **League ID**: 39 (Premier League)
- **Season**: 2025

### The Odds API
- **Base URL**: `https://api.the-odds-api.com/v4`
- **Sport Key**: `soccer_epl`

---

## Project Structure

```
/Users/simeonpenev/Desktop/Football Prediction/
├── .claude/
│   └── settings.local.json     # MCP server configurations
├── supabase/
│   └── migrations/             # SQL migration files
├── n8n-workflows/
│   ├── sync/                   # Data sync workflows
│   └── prediction/             # AI prediction workflow
├── scripts/
│   ├── import/                 # Historical data import
│   └── utils/                  # Helper utilities
├── app/                        # Next.js web application
├── docs/
│   └── FACTORS.md              # Factor system documentation
├── .env.local                  # Environment variables (DO NOT COMMIT)
├── .env.example                # Template for env vars
└── CLAUDE.md                   # This file
```

---

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `leagues` | League info (Premier League = api_id: 39) |
| `teams` | Club data with venue references |
| `venues` | Stadium data with lat/lng |
| `fixtures` | Match schedule and results |
| `standings` | Current league table |
| `team_season_stats` | Aggregated team statistics |
| `fixture_statistics` | Per-match detailed stats |
| `fixture_events` | Goals, cards, substitutions |
| `lineups` | Starting XI and formations |
| `injuries` | Current injury list |
| `referee_stats` | Referee tendency data |
| `odds` | Betting odds from The Odds API |
| `predictions` | AI-generated predictions |

---

## n8n Workflows

### Data Sync Workflows
1. **Sync_Standings** - Daily 06:00 UTC
2. **Sync_Fixtures_Upcoming** - Daily 06:15 UTC
3. **Sync_Team_Stats** - Weekly Sunday 05:00 UTC
4. **Sync_Injuries** - Daily 07:30 UTC
5. **Sync_Completed_Matches** - Daily 08:00 UTC
6. **Sync_Odds** - Every 4 hours on matchday
7. **Sync_Lineups** - 1 hour before kickoff

### AI Prediction Workflow
- **Trigger**: Webhook `POST /webhook/predict`
- **Payload**: `{ "fixture_id": "uuid" }`
- **AI Model**: OpenAI GPT-4o (credential already in n8n)

---

## Factor System (A-F)

**Updated: December 2024** - Simplified to 6 factors matching NEW_AI_AGENT_PROMPT.txt.

The prediction model uses 6 factor groups (totaling 100%):

| Group | Weight | Description |
|-------|--------|-------------|
| A | 24% | Base Strength (xG balance, home advantage, defense & offense) |
| B | 22% | Recent Form (xG trends, results, opponent quality, consistency) |
| C | 11% | Key Players (penalty takers, top performers, injuries) |
| D | 20% | Tactical Matchup (press vs build-up, high line, aerial duels) |
| E | 13% | Table Position & Context (league standing, club context) |
| F | 10% | Head-to-Head (historical results & patterns) |

Each factor is scored 1-100, producing an overall_index that favors home (>50) or away (<50).

**Factor JSON Structure:**
```json
{
  "A_base_strength": { "score": 65, "weighted": 15.6, "notes": "..." },
  "B_form": { "score": 72, "weighted": 15.8, "notes": "..." },
  "C_key_players": { "score": 45, "weighted": 5.0, "notes": "..." },
  "D_tactical": { "score": 60, "weighted": 12.0, "notes": "..." },
  "E_table_position": { "score": 55, "weighted": 7.2, "notes": "..." },
  "F_h2h": { "score": 70, "weighted": 7.0, "notes": "..." }
}
```

See `/n8n-workflows/prediction/NEW_AI_AGENT_PROMPT.txt` for full prompt.

---

## API-Football Endpoints Used

```
GET /teams?league=39&season=2025
GET /fixtures?league=39&season=2025
GET /fixtures?ids={id1}-{id2}-...  # Bulk fetch with stats
GET /fixtures/statistics?fixture={id}
GET /fixtures/events?fixture={id}
GET /fixtures/lineups?fixture={id}
GET /teams/statistics?league=39&season=2025&team={id}
GET /standings?league=39&season=2025
GET /injuries?league=39&season=2025
GET /fixtures/headtohead?h2h={team1}-{team2}
```

---

## Live Match Auto-Sync

The `/api/fixtures/live` endpoint includes automatic sync for finished matches:

1. **Detection**: When the endpoint is called, it checks for matches that:
   - Started > 1.5 hours ago
   - Still show as in-play status (1H, 2H, HT, etc.)

2. **Sync**: For stale matches, it:
   - Fetches current status from API-Football by fixture IDs
   - Updates the database with FT status and final scores
   - Runs as a background task (doesn't block the response)

3. **Result**: Finished matches automatically move from "Live" to "Results" section

**Note**: After matches finish, you may want to manually trigger these refreshes from the Data page:
- **Post-Match**: Gets statistics, events, lineups for completed matches
- **Fixture Statistics**: Detailed match statistics
- **Fixture Events**: Goals, cards, substitutions

---

## Common Commands

```bash
# Install dependencies
npm install

# Run import script
npx tsx scripts/import/initial-import.ts

# Start Next.js dev server
npm run dev

# Build for production
npm run build
```

---

## VM Deployment

### Hetzner VM
- **IP**: `91.99.217.15`
- **User**: `simeon_penew`
- **SSH Key**: `~/.ssh/hetzner_dify_key`
- **Domain**: `https://football.analyserinsights.com`

### Project Location
- **Path**: `/var/www/football-prediction`
- **PM2 Process**: `football-prediction`
- **Port**: `3004`

### Deployment Commands

```bash
# SSH into VM
ssh -i ~/.ssh/hetzner_dify_key simeon_penew@91.99.217.15

# Full deployment (from local machine)
ssh -i ~/.ssh/hetzner_dify_key simeon_penew@91.99.217.15 \
  "cd /var/www/football-prediction && git pull && rm -rf .next && npm run build && pm2 restart football-prediction"

# Check PM2 status
ssh -i ~/.ssh/hetzner_dify_key simeon_penew@91.99.217.15 "pm2 status football-prediction"

# View logs
ssh -i ~/.ssh/hetzner_dify_key simeon_penew@91.99.217.15 "pm2 logs football-prediction --lines 50"
```

### Caddy Configuration
The app is served via Caddy reverse proxy:
```
football.analyserinsights.com {
    reverse_proxy localhost:3004
}
```

### Other Services on this VM
- **agento** (port varies) - Agent platform
- **n8n** - `nn.analyserinsights.com`

---

## Important Notes

1. **API Rate Limits**: API-Football has daily limits. Use bulk endpoints.
2. **Season**: Currently tracking 2025-2026 season (started Aug 2025).
3. **Lineups**: Only available ~1hr before kickoff.
4. **xG Data**: API-Football `expected_goals` may be null for some matches.

---

## Security & Troubleshooting

**Updated: January 2026** - Fresh security audit completed. All critical/high issues resolved.

### Security Audit Summary

| Category | Status | Details |
|----------|--------|---------|
| Cookie Security | ✅ Excellent | HMAC-SHA256 signing, timing-safe comparison, no legacy fallbacks |
| Authentication | ✅ Excellent | Centralized `isAdmin()`, API key support, cookie-based auth |
| Rate Limiting | ✅ Implemented | 5 attempts/IP, 15-min block on login |
| Security Headers | ✅ Strong | CSP, HSTS, X-Frame-Options, Permissions-Policy |
| Input Validation | ✅ Complete | UUID, range, date, password validation |

### Security Features Implemented

| Phase | Status | Features |
|-------|--------|----------|
| 1 - Critical | ✅ Done | Auth on 24 refresh routes, security headers, cookie signing (HMAC-SHA256), rate limiting |
| 2 - High | ✅ Done | Input validation, API retry logic (exponential backoff), env validation at startup |
| 3 - Medium | ✅ Done | XSS protection (rehype-sanitize), middleware fixes, error boundary |
| 4 - Low | ✅ Done | Magic number extraction, code cleanup |

### Performance Optimizations (January 2026)

| Optimization | File | Impact |
|--------------|------|--------|
| Batch upserts | fixture-events, fixture-statistics, standings, team-stats | Reduced DB calls by 95% |
| Parallel execution | post-match/route.ts | 6x faster refresh |
| Query filtering | fixture-statistics, fixture-events | Eliminated full table scans |
| Database indexes | Migration 015 | Faster queries on fixtures, events, standings |

### Required Environment Variables

| Variable | Required | Prod Only | Description |
|----------|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | No | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | No | Supabase service role key |
| `API_FOOTBALL_KEY` | Yes | No | API-Football API key |
| `COOKIE_SECRET` | Yes | **Yes** | Min 32 chars, signs auth cookies |
| `N8N_WEBHOOK_URL` | No | No | n8n webhook for predictions |
| `ODDS_API_KEY` | No | No | The Odds API key |

**Generate COOKIE_SECRET**: `openssl rand -base64 32`

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid UUID, limit out of range (1-100), malformed JSON |
| 401 | Unauthorized | Missing auth cookie, expired session |
| 403 | Forbidden | Not admin (for `/api/data/refresh/*` routes) |
| 429 | Too Many Requests | Rate limited (5+ failed logins in 15 min) |
| 500 | Server Error | Database error, API failure, missing env vars |

### Common Issues & Fixes

**"Internal Server Error" on startup**
```bash
# Check logs
pm2 logs football-prediction --lines 50
# Common cause: Missing COOKIE_SECRET
# Fix: Add to .env.local
echo "COOKIE_SECRET=$(openssl rand -base64 32)" >> .env.local
pm2 restart football-prediction
```

**"Unauthorized" (403) on data refresh**
- Cause: Not logged in as admin
- Fix: Login with admin account first

**"Too many login attempts" (429)**
- Cause: Rate limiting (5 attempts per IP / 15 min)
- Fix: Wait 15 minutes, or restart app to clear in-memory limits

**"Invalid fixture_id format" (400)**
- Cause: ID is not a valid UUID
- Fix: Use proper UUID format (e.g., `123e4567-e89b-12d3-a456-426614174000`)

**Cookie not persisting after login**
- Cause: Different `COOKIE_SECRET` between deployments
- Fix: Use same secret, or users must re-login

### Security File Locations

| File | Purpose |
|------|---------|
| `lib/auth/cookie-sign.ts` | HMAC-SHA256 cookie signing |
| `lib/auth/rate-limit.ts` | Login brute force protection |
| `lib/auth/verify-admin.ts` | Admin verification helper |
| `lib/validation.ts` | Input validation (UUID, range, etc.) |
| `lib/config/validate-env.ts` | Startup environment validation |
| `middleware.ts` | Route protection & auth |
| `components/error-boundary.tsx` | React error catching |

### Health Check Commands

```bash
# Check app status
pm2 status football-prediction

# View logs
pm2 logs football-prediction --lines 50

# Check env validation passed
pm2 logs football-prediction | grep "Env Validation"

# Test site responds (307 = redirect to login, expected)
curl -s -o /dev/null -w "%{http_code}" https://football.analyserinsights.com/
```

---

## MCP Servers

This project uses two MCP servers configured in `.claude/settings.local.json`:

1. **n8n-mcp**: For building and managing n8n workflows
2. **supabase**: For database operations (requires OAuth login on first use)

After modifying `.claude/settings.local.json`, restart Claude Code to activate.
