# Football Prediction AI Workflow - Summary

## Overview

An n8n workflow that generates AI-powered football match predictions using GPT-4o and comprehensive team data from Supabase.

## Files Created

1. **Football_Prediction_AI.json** - The n8n workflow definition
2. **README.md** - Comprehensive workflow documentation
3. **IMPORT_GUIDE.md** - Step-by-step import instructions
4. **WORKFLOW_SUMMARY.md** - This file

## Updated Files

1. **app/api/predictions/generate/route.ts** - Updated to work with new workflow response format
2. **.env.example** - Added N8N_PREDICTION_WEBHOOK variable

## Workflow Architecture

### Nodes (11 total)

1. **Webhook Trigger** - Receives POST requests
2. **Fetch Home Team Stats** - Gets season stats for home team
3. **Fetch Away Team Stats** - Gets season stats for away team
4. **Fetch Home Team Form** - Last 5 matches for home team
5. **Fetch Away Team Form** - Last 5 matches for away team
6. **Fetch Injuries** - Current injuries for both teams
7. **Fetch Standings** - League table positions
8. **Build AI Prompt** - Combines data into comprehensive prompt
9. **OpenAI Analysis** - GPT-4o generates prediction
10. **Parse AI Response** - Extracts structured JSON
11. **Webhook Response** - Returns prediction to caller

### Data Flow

```
Webhook
  |
  ├─> Fetch Home Team Stats ──> Fetch Home Form ─┐
  └─> Fetch Away Team Stats ──> Fetch Away Form ─┤
                                                   |
                              Fetch Injuries <─────┘
                                    |
                              Fetch Standings
                                    |
                              Build AI Prompt
                                    |
                              OpenAI Analysis
                                    |
                              Parse AI Response
                                    |
                             Webhook Response
```

## API Contract

### Request

```json
POST /webhook/football-prediction
{
  "fixture_id": "uuid",
  "home_team": "Liverpool",
  "home_team_id": "uuid",
  "away_team": "Arsenal",
  "away_team_id": "uuid",
  "match_date": "2025-12-26T15:00:00Z",
  "venue": "Anfield",
  "round": "Regular Season - 18"
}
```

### Response

```json
{
  "fixture_id": "uuid",
  "home_team": "Liverpool",
  "away_team": "Arsenal",
  "match_date": "2025-12-26T15:00:00Z",
  "venue": "Anfield",
  "prediction": "1",
  "confidence_pct": 68,
  "probabilities": {
    "home_win_pct": 55,
    "draw_pct": 22,
    "away_win_pct": 23
  },
  "over_under_2_5": "Over",
  "btts": "Yes",
  "value_bet": "Home Win @ 1.85",
  "key_factors": [
    "Liverpool's strong home form at Anfield",
    "Arsenal's recent defensive issues"
  ],
  "risk_factors": [
    "Arsenal's counter-attacking threat"
  ],
  "analysis": "Detailed paragraph analysis...",
  "generated_at": "2025-12-24T10:30:00.000Z"
}
```

## Deployment Steps

### 1. Prerequisites
- Access to n8n instance at https://nn.analyserinsights.com/
- OpenAI API key configured in n8n
- Supabase database populated with team data

### 2. Import Workflow
```bash
# In n8n dashboard:
# 1. Workflows > Import from File
# 2. Select Football_Prediction_AI.json
# 3. Configure OpenAI credentials
# 4. Activate workflow
```

### 3. Update Environment Variables
```bash
# Add to .env.local
N8N_PREDICTION_WEBHOOK=https://nn.analyserinsights.com/webhook/football-prediction
```

### 4. Test the Workflow
```bash
# Get team IDs from database
# Update scripts/test-prediction-workflow.ts
npx tsx scripts/test-prediction-workflow.ts
```

## Integration Points

### Next.js API Route
The workflow integrates with the existing API route:
- **File**: `/app/api/predictions/generate/route.ts`
- **Endpoint**: `POST /api/predictions/generate`
- **Action**: Fetches fixture data, calls n8n webhook, saves prediction

### Frontend Integration
Call from React components:
```typescript
const response = await fetch('/api/predictions/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fixture_id: 'uuid' })
});
const { prediction } = await response.json();
```

## Data Sources

### Supabase Tables
- `team_season_stats` - Season aggregates (xG, possession, etc.)
- `fixtures` - Match history for form analysis
- `injuries` - Current injury status
- `standings` - League table positions

### Future Enhancements
Could add:
- `weather` - Match weather conditions
- `odds` - Betting odds for value analysis
- `referee_stats` - Referee tendencies
- Head-to-head historical data

## AI Prompt Structure

The prompt includes:
1. Match context (teams, venue, date, round)
2. Home team season stats
3. Away team season stats
4. Recent form (last 5 matches each)
5. Current injuries
6. League positions
7. Analysis instructions
8. Required JSON output format

## Performance

### Expected Response Times
- Supabase queries: ~200-500ms each
- Total data fetching: ~1-2 seconds
- OpenAI GPT-4o analysis: ~3-10 seconds
- **Total workflow time**: 5-15 seconds

### Costs
- OpenAI GPT-4o: ~$0.01-0.05 per prediction
- Supabase: Free tier sufficient for most usage
- n8n: Included in your plan

## Monitoring

### Execution Logs
View in n8n:
- Executions > Football Prediction AI
- See all webhook calls and results
- Debug failed predictions

### Success Metrics
Track:
- Success rate (% of successful completions)
- Average response time
- AI confidence levels
- Prediction accuracy (post-match validation)

## Troubleshooting

### Common Issues

**"OpenAI credentials not found"**
- Configure OpenAI API credentials in n8n

**"No data returned from Supabase"**
- Verify team IDs are valid UUIDs
- Check Supabase anon key is correct
- Ensure data sync workflows have run

**"Invalid JSON from AI"**
- GPT-4o occasionally formats incorrectly
- Parse node handles most cases
- Check execution logs for raw response

**Workflow times out**
- Increase n8n workflow timeout
- Check OpenAI API status
- Verify Supabase response times

## Security

- Supabase anon key is embedded (safe for read-only operations)
- OpenAI key stored securely in n8n credentials
- Webhook is public but only reads data
- Consider adding authentication for production

## Next Steps

After deployment:

1. **Test with real fixtures** - Use upcoming matches
2. **Monitor accuracy** - Track predictions vs actual results
3. **Tune prompt** - Improve based on prediction quality
4. **Add features**:
   - Head-to-head analysis
   - Weather impact
   - Betting odds integration
   - Referee analysis
5. **Cache predictions** - Avoid duplicate calls for same fixture
6. **Add webhooks** - Notify when predictions are ready
7. **Build dashboard** - Visualize prediction accuracy over time

## Support

For issues or questions:
1. Check n8n execution logs
2. Review this documentation
3. Test individual nodes in n8n editor
4. Verify all prerequisites are met
5. Check OpenAI and Supabase status pages

## Credits

- **AI Model**: OpenAI GPT-4o
- **Workflow Engine**: n8n
- **Database**: Supabase
- **Team Data**: API-Football

---

**Created**: December 24, 2025
**Version**: 1.0
**Status**: Ready for deployment
