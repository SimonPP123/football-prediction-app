# Football Prediction AI Workflow - Visual Diagram

## High-Level Flow

```
┌─────────────────┐
│  HTTP Request   │
│  POST /webhook/ │
│ football-pred.. │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Webhook     │
│     Trigger     │
└────────┬────────┘
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  Fetch Home      │          │  Fetch Away      │
│  Team Stats      │          │  Team Stats      │
│  (Supabase)      │          │  (Supabase)      │
└────────┬─────────┘          └────────┬─────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  Fetch Home      │          │  Fetch Away      │
│  Team Form       │          │  Team Form       │
│  (Last 5 Games)  │          │  (Last 5 Games)  │
└────────┬─────────┘          └────────┬─────────┘
         │                              │
         └──────────────┬───────────────┘
                        │
                        ▼
                ┌──────────────────┐
                │  Fetch Injuries  │
                │  (Both Teams)    │
                │  (Supabase)      │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Fetch Standings  │
                │ (League Table)   │
                │  (Supabase)      │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │  Build AI        │
                │  Prompt          │
                │  (Combine Data)  │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │  OpenAI GPT-4o   │
                │  Analysis        │
                │  (AI Prediction) │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │  Parse AI        │
                │  Response        │
                │  (Extract JSON)  │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │  Webhook         │
                │  Response        │
                │  (Return JSON)   │
                └──────────────────┘
```

## Detailed Node-by-Node Flow

### 1. Webhook Trigger
```
Input:  HTTP POST request
Fields: fixture_id, home_team, home_team_id, away_team, away_team_id,
        match_date, venue, round
Output: JSON body passed to next nodes
```

### 2. Fetch Home Team Stats (HTTP Request)
```
URL:    https://ypddcrvjeeqavqpcypoa.supabase.co/rest/v1/team_season_stats
Filter: team_id=eq.{{ home_team_id }}
Output: Season statistics (goals, xG, possession, etc.)
```

### 3. Fetch Away Team Stats (HTTP Request)
```
URL:    https://ypddcrvjeeqavqpcypoa.supabase.co/rest/v1/team_season_stats
Filter: team_id=eq.{{ away_team_id }}
Output: Season statistics (goals, xG, possession, etc.)
```

### 4. Fetch Home Team Form (HTTP Request)
```
URL:    https://ypddcrvjeeqavqpcypoa.supabase.co/rest/v1/fixtures
Filter: team_id=eq.{{ home_team_id }}
Order:  fixture_date DESC
Limit:  5
Output: Last 5 match results
```

### 5. Fetch Away Team Form (HTTP Request)
```
URL:    https://ypddcrvjeeqavqpcypoa.supabase.co/rest/v1/fixtures
Filter: team_id=eq.{{ away_team_id }}
Order:  fixture_date DESC
Limit:  5
Output: Last 5 match results
```

### 6. Fetch Injuries (HTTP Request)
```
URL:    https://ypddcrvjeeqavqpcypoa.supabase.co/rest/v1/injuries
Filter: team_id IN (home_team_id, away_team_id)
Output: Current injury list for both teams
```

### 7. Fetch Standings (HTTP Request)
```
URL:    https://ypddcrvjeeqavqpcypoa.supabase.co/rest/v1/standings
Filter: team_id IN (home_team_id, away_team_id)
Output: League positions and points
```

### 8. Build AI Prompt (Set Node)
```
Action: Combine all fetched data into comprehensive prompt
Fields: ai_prompt (string)
Prompt includes:
  - Match details
  - Home/away team stats
  - Recent form
  - Injuries
  - Standings
  - Analysis instructions
  - JSON output format
```

### 9. OpenAI Analysis (OpenAI Node)
```
Model:       GPT-4o
Temperature: 0.7
Max Tokens:  2000
Input:       AI prompt from previous node
Output:      AI-generated prediction as JSON string
```

### 10. Parse AI Response (Code Node)
```
Language: JavaScript
Action:   Extract JSON from markdown code blocks
          Parse JSON response
          Add original webhook data
          Format final response
Output:   Structured prediction object
```

### 11. Webhook Response (Respond to Webhook)
```
Format:  JSON
Headers: Content-Type: application/json
Body:    Complete prediction with probabilities,
         key factors, risk factors, and analysis
```

## Data Dependencies

```
┌──────────────────────────────────────────────────────┐
│                   Webhook Input                      │
│  • fixture_id, home_team_id, away_team_id           │
│  • home_team, away_team, venue, match_date, round   │
└────────────────┬─────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌───────────────┐   ┌───────────────┐
│  Home Team    │   │  Away Team    │
│  Data         │   │  Data         │
├───────────────┤   ├───────────────┤
│ • Stats       │   │ • Stats       │
│ • Form        │   │ • Form        │
└───────────────┘   └───────────────┘
        │                 │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌───────────────┐   ┌───────────────┐
│  Injuries     │   │  Standings    │
│  (Both)       │   │  (Both)       │
└───────────────┘   └───────────────┘
        │                 │
        └────────┬────────┘
                 │
                 ▼
        ┌────────────────┐
        │   AI Prompt    │
        │   (Combined)   │
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │   GPT-4o AI    │
        │   Analysis     │
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │   Prediction   │
        │   Response     │
        └────────────────┘
```

## Execution Timeline

```
Time      Node                          Action
─────     ────                          ──────
0.0s      Webhook                       Receive request
0.1s      Fetch Home Stats              Query Supabase
0.1s      Fetch Away Stats              Query Supabase (parallel)
0.5s      Fetch Home Form               Query Supabase
0.5s      Fetch Away Form               Query Supabase (parallel)
1.0s      Fetch Injuries                Query Supabase
1.3s      Fetch Standings               Query Supabase
1.5s      Build AI Prompt               Combine all data
1.6s      OpenAI Analysis               Send to GPT-4o
5.0s      [OpenAI Processing]           AI generates prediction
8.0s      Parse AI Response             Extract JSON
8.1s      Webhook Response              Return to caller
─────
8.1s      TOTAL EXECUTION TIME
```

## Error Handling Flow

```
┌─────────────┐
│  Any Node   │
└──────┬──────┘
       │
    [Error?]
       │
   ┌───┴───┐
   │  Yes  │─────────┐
   └───────┘         │
       │             ▼
   ┌───┴───┐    ┌───────────────┐
   │  No   │    │  Log Error    │
   └───┬───┘    │  Return 500   │
       │        └───────────────┘
       ▼
┌──────────────┐
│  Continue    │
└──────────────┘
```

## Parallel Execution

The workflow executes certain nodes in parallel for performance:

```
Webhook Trigger
    │
    ├──> Home Stats ──> Home Form ──┐
    │                                │
    └──> Away Stats ──> Away Form ───┤
                                     │
                            [Wait for both]
                                     │
                              Fetch Injuries
                                     │
                              Fetch Standings
                                     │
                             [Continue serial]
```

This parallel execution reduces total time from ~3-4 seconds to ~1-2 seconds for data fetching.

## Integration with Next.js App

```
┌─────────────────────┐
│  User Browser       │
│  (Frontend)         │
└──────────┬──────────┘
           │ Click "Generate Prediction"
           ▼
┌─────────────────────┐
│  Next.js API        │
│  /api/predictions/  │
│  generate           │
└──────────┬──────────┘
           │ 1. Fetch fixture details
           ▼
┌─────────────────────┐
│  Supabase           │
│  (Get fixture data) │
└──────────┬──────────┘
           │ 2. Call n8n webhook
           ▼
┌─────────────────────┐
│  n8n Workflow       │
│  (This workflow)    │
└──────────┬──────────┘
           │ 3. Return prediction
           ▼
┌─────────────────────┐
│  Next.js API        │
│  (Save to DB)       │
└──────────┬──────────┘
           │ 4. Return to frontend
           ▼
┌─────────────────────┐
│  User Browser       │
│  (Display result)   │
└─────────────────────┘
```

## Node Configuration Summary

| Node | Type | Purpose | Timeout |
|------|------|---------|---------|
| Webhook | Trigger | Receive requests | N/A |
| Fetch Home Stats | HTTP Request | Get season stats | 10s |
| Fetch Away Stats | HTTP Request | Get season stats | 10s |
| Fetch Home Form | HTTP Request | Get recent matches | 10s |
| Fetch Away Form | HTTP Request | Get recent matches | 10s |
| Fetch Injuries | HTTP Request | Get injury list | 10s |
| Fetch Standings | HTTP Request | Get league table | 10s |
| Build Prompt | Set | Combine data | N/A |
| OpenAI Analysis | OpenAI | AI prediction | 60s |
| Parse Response | Code | Extract JSON | N/A |
| Webhook Response | Respond | Return result | N/A |

---

**Total Nodes**: 11
**External API Calls**: 7 (6 Supabase + 1 OpenAI)
**Expected Duration**: 5-15 seconds
**Error Handling**: Built-in to n8n
**Parallel Execution**: Yes (Stats & Form nodes)
