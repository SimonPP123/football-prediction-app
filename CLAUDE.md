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
| `weather` | Match weather conditions |
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
7. **Sync_Weather** - Daily 09:00 UTC
8. **Sync_Lineups** - 1 hour before kickoff

### AI Prediction Workflow
- **Trigger**: Webhook `POST /webhook/predict`
- **Payload**: `{ "fixture_id": "uuid" }`
- **AI Model**: OpenAI GPT-4o (credential already in n8n)

---

## Factor System (A-I)

The prediction model uses 9 factor groups:

| Group | Weight | Description |
|-------|--------|-------------|
| A | 18% | Base Strength (xG, home advantage, defense, offense) |
| B | 16% | Form (recent results, opponent quality) |
| C | 14% | Squad (injuries, returns, cohesion) |
| D | 10% | Load (rest days, congestion, travel) |
| E | 12% | Tactical (pressing, transitions) |
| F | 10% | Motivation (table stakes, derby) |
| G | 5% | Referee (card/penalty tendencies) |
| H | 8% | Stadium (pitch, weather, attendance) |
| I | 7% | H2H (historical results) |

Each factor is scored 1-100, producing an overall_index that favors home (>50) or away (<50).

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

## Important Notes

1. **API Rate Limits**: API-Football has daily limits. Use bulk endpoints.
2. **Season**: 2025-2026 starts Aug 2025. 
3. **Lineups**: Only available ~1hr before kickoff.
4. **xG Data**: API-Football `expected_goals` may be null for some matches.
5. **Weather**: Free Open-Meteo API, no key needed.

---

## MCP Servers

This project uses two MCP servers configured in `.claude/settings.local.json`:

1. **n8n-mcp**: For building and managing n8n workflows
2. **supabase**: For database operations (requires OAuth login on first use)

After modifying `.claude/settings.local.json`, restart Claude Code to activate.
