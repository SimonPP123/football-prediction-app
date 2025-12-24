# Quick Start Guide - Football Prediction AI Workflow

Get the Football Prediction AI workflow up and running in 10 minutes.

## Prerequisites Checklist

- [ ] Access to n8n at https://nn.analyserinsights.com/
- [ ] OpenAI API key (for GPT-4o)
- [ ] Supabase database populated with team data
- [ ] Teams, fixtures, and stats tables have data

## Step 1: Import Workflow (2 minutes)

1. Open https://nn.analyserinsights.com/
2. Click **Workflows** in left sidebar
3. Click **Import from File** button
4. Select `Football_Prediction_AI.json`
5. Workflow opens in editor

## Step 2: Configure OpenAI (1 minute)

1. Click the **"OpenAI Analysis"** node (purple node)
2. Under **Credentials**, click dropdown
3. If OpenAI credential exists:
   - Select it
   - Skip to Step 3
4. If no credential exists:
   - Click **"Create New"**
   - Name: `OpenAI API`
   - API Key: Paste your OpenAI API key
   - Click **Save**

## Step 3: Activate Workflow (30 seconds)

1. Click the **toggle switch** in top-right corner
2. Switch should turn blue/green
3. Status shows **"Active"**

## Step 4: Get Webhook URL (30 seconds)

1. Click the **"Webhook"** node (first node)
2. Copy the **Production URL**
3. Should look like: `https://nn.analyserinsights.com/webhook/football-prediction`

## Step 5: Update Environment Variable (1 minute)

1. Open `.env.local` in your project root
2. Add this line:
   ```
   N8N_PREDICTION_WEBHOOK=https://nn.analyserinsights.com/webhook/football-prediction
   ```
3. Save file

## Step 6: Test the Workflow (5 minutes)

### Option A: Quick Test with curl

```bash
# Get team IDs from Supabase first
# Then replace UUIDs below

curl -X POST https://nn.analyserinsights.com/webhook/football-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "fixture_id": "test-123",
    "home_team": "Liverpool",
    "home_team_id": "YOUR_LIVERPOOL_UUID",
    "away_team": "Arsenal",
    "away_team_id": "YOUR_ARSENAL_UUID",
    "match_date": "2025-12-26T15:00:00Z",
    "venue": "Anfield",
    "round": "Regular Season - 18"
  }'
```

### Option B: Using the Test Script

1. Get team IDs from Supabase:
   ```sql
   SELECT id, name FROM teams WHERE name IN ('Liverpool', 'Arsenal');
   ```

2. Open `scripts/test-prediction-workflow.ts`

3. Replace the placeholder UUIDs:
   ```typescript
   home_team_id: 'YOUR_LIVERPOOL_UUID',  // Replace this
   away_team_id: 'YOUR_ARSENAL_UUID',    // Replace this
   ```

4. Uncomment the line:
   ```typescript
   await testPrediction(testRequest);
   ```

5. Run the test:
   ```bash
   npx tsx scripts/test-prediction-workflow.ts
   ```

### Expected Output

```json
{
  "fixture_id": "test-123",
  "home_team": "Liverpool",
  "away_team": "Arsenal",
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
    "Liverpool's strong home form",
    "Arsenal's defensive issues"
  ],
  "risk_factors": [
    "Arsenal's counter-attack threat"
  ],
  "analysis": "Detailed analysis paragraph...",
  "generated_at": "2025-12-24T10:30:00.000Z"
}
```

## Step 7: Verify in n8n (1 minute)

1. Go to **Executions** in n8n sidebar
2. You should see your test execution
3. Click it to view the data flow
4. All nodes should be green (success)

## Done!

Your Football Prediction AI workflow is now live and ready to use.

## Next Steps

### Integrate with Frontend

Add a button in your Next.js app:

```typescript
async function generatePrediction(fixtureId: string) {
  const response = await fetch('/api/predictions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fixture_id: fixtureId })
  });

  const { prediction } = await response.json();
  return prediction;
}
```

### Monitor Performance

Track these metrics:
- **Success Rate**: % of executions that complete
- **Response Time**: Average time from request to response
- **AI Confidence**: Average confidence_pct
- **Prediction Accuracy**: After matches complete

### Optimize Costs

- GPT-4o costs ~$0.01-0.05 per prediction
- Cache predictions to avoid duplicates
- Consider using GPT-4o-mini for lower costs

## Troubleshooting

### "OpenAI credentials not found"
→ Go back to Step 2 and configure OpenAI credentials

### "No data returned from Supabase"
→ Verify team IDs are correct UUIDs
→ Check that team_season_stats table has data
→ Ensure data sync workflows have run

### "Workflow execution timed out"
→ Check OpenAI API status: https://status.openai.com/
→ Verify Supabase is responding
→ Try again (temporary network issue)

### Response takes too long (>20 seconds)
→ Normal for first run (cold start)
→ Subsequent runs should be 5-15 seconds
→ Check n8n execution logs for bottlenecks

## Getting Help

1. **Check execution logs** in n8n
2. **Review documentation**:
   - README.md - Comprehensive guide
   - IMPORT_GUIDE.md - Detailed import steps
   - WORKFLOW_DIAGRAM.md - Visual flow
3. **Test individual nodes** in n8n editor
4. **Verify prerequisites** are met

## Common Patterns

### Generate prediction for upcoming match
```bash
curl -X POST https://nn.analyserinsights.com/webhook/football-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "fixture_id": "actual-fixture-uuid",
    "home_team": "Manchester City",
    "home_team_id": "man-city-uuid",
    "away_team": "Chelsea",
    "away_team_id": "chelsea-uuid",
    "match_date": "2025-12-28T17:30:00Z",
    "venue": "Etihad Stadium",
    "round": "Regular Season - 19"
  }'
```

### Bulk generate predictions
Loop through upcoming fixtures:
```typescript
const fixtures = await getUpcomingFixtures();
for (const fixture of fixtures) {
  await generatePrediction(fixture.id);
  await sleep(2000); // Rate limit
}
```

## Success Indicators

You'll know it's working when:
- ✅ Workflow shows "Active" status
- ✅ Test request returns prediction in 5-15 seconds
- ✅ Execution appears in n8n Executions tab
- ✅ All nodes are green in execution view
- ✅ Frontend can call API and display predictions

## What's Next?

After successful deployment:

1. **Create predictions for this weekend's matches**
2. **Track accuracy after matches complete**
3. **Tune the AI prompt for better predictions**
4. **Add more data sources** (weather, odds, etc.)
5. **Build analytics dashboard** for prediction performance

---

**Estimated Setup Time**: 10 minutes
**First Prediction**: 5-15 seconds
**Cost per Prediction**: $0.01-0.05
**Status**: Production Ready

Enjoy your AI-powered football predictions! ⚽
