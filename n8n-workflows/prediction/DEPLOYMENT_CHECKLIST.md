# Deployment Checklist - Football Prediction AI Workflow

Use this checklist to ensure successful deployment of the workflow.

## Pre-Deployment

### Prerequisites
- [ ] Access to n8n instance (https://nn.analyserinsights.com/)
- [ ] OpenAI API key available
- [ ] Supabase database is populated with data
- [ ] Node.js and npm/npx installed locally
- [ ] .env.local file exists in project root

### Data Verification
- [ ] `teams` table has Premier League teams
- [ ] `team_season_stats` table has current season data
- [ ] `fixtures` table has upcoming and past matches
- [ ] `injuries` table is populated
- [ ] `standings` table is up to date

Run this query to verify:
```sql
SELECT
  (SELECT COUNT(*) FROM teams) as teams_count,
  (SELECT COUNT(*) FROM team_season_stats) as stats_count,
  (SELECT COUNT(*) FROM fixtures) as fixtures_count,
  (SELECT COUNT(*) FROM injuries) as injuries_count,
  (SELECT COUNT(*) FROM standings) as standings_count;
```

Expected results:
- teams_count: ~20 (Premier League teams)
- stats_count: ~20+ (at least one per team)
- fixtures_count: 100+ (current season matches)
- standings_count: ~20 (current league table)

## Deployment Steps

### 1. Import Workflow
- [ ] Open n8n dashboard
- [ ] Navigate to Workflows
- [ ] Click "Import from File"
- [ ] Select `Football_Prediction_AI.json`
- [ ] Workflow loads in editor

### 2. Configure Credentials
- [ ] Click "OpenAI Analysis" node
- [ ] Check if OpenAI credential exists
- [ ] If yes: Select existing credential
- [ ] If no: Create new credential
  - [ ] Name: "OpenAI API"
  - [ ] API Key: Paste key
  - [ ] Save credential

### 3. Verify Supabase Configuration
- [ ] Click "Fetch Home Team Stats" node
- [ ] Verify URL contains correct project ID: `ypddcrvjeeqavqpcypoa`
- [ ] Verify Authorization header is set
- [ ] Repeat for other Supabase nodes

### 4. Test Individual Nodes (Optional)
- [ ] Click "Fetch Home Team Stats" node
- [ ] Click "Execute Node" (requires test data)
- [ ] Verify it returns data
- [ ] Repeat for other data-fetching nodes

### 5. Activate Workflow
- [ ] Click toggle switch in top-right
- [ ] Verify status shows "Active"
- [ ] Note the webhook URL

### 6. Update Environment Variables
- [ ] Open `.env.local`
- [ ] Add: `N8N_PREDICTION_WEBHOOK=<your-webhook-url>`
- [ ] Save file
- [ ] Restart Next.js dev server (if running)

## Testing

### Test 1: Get Team IDs
```sql
SELECT id, name FROM teams
WHERE name IN ('Liverpool', 'Arsenal')
ORDER BY name;
```
- [ ] Copy Liverpool's UUID
- [ ] Copy Arsenal's UUID

### Test 2: Update Test Script
- [ ] Open `scripts/test-prediction-workflow.ts`
- [ ] Replace `REPLACE_WITH_REAL_LIVERPOOL_UUID` with Liverpool's ID
- [ ] Replace `REPLACE_WITH_REAL_ARSENAL_UUID` with Arsenal's ID
- [ ] Uncomment `await testPrediction(testRequest);`
- [ ] Save file

### Test 3: Run Test Script
```bash
npx tsx scripts/test-prediction-workflow.ts
```
- [ ] Script executes without errors
- [ ] Prediction is returned (5-15 seconds)
- [ ] Prediction includes all fields:
  - [ ] prediction (1/X/2)
  - [ ] confidence_pct
  - [ ] probabilities (home/draw/away)
  - [ ] over_under_2_5
  - [ ] btts
  - [ ] key_factors (array)
  - [ ] risk_factors (array)
  - [ ] analysis (paragraph)

### Test 4: Verify in n8n
- [ ] Open n8n Executions tab
- [ ] Find the test execution
- [ ] Click to view details
- [ ] All nodes are green (success)
- [ ] Data flows correctly through all nodes

### Test 5: Integration Test
- [ ] Start Next.js dev server: `npm run dev`
- [ ] Navigate to fixtures page
- [ ] Click "Generate Prediction" on a fixture
- [ ] Prediction loads successfully
- [ ] Prediction saves to database

## Post-Deployment

### Monitor First Week
- [ ] Check n8n execution logs daily
- [ ] Track success rate (should be >95%)
- [ ] Monitor response times (should be <15s)
- [ ] Watch OpenAI costs in dashboard

### Performance Baseline
Track these metrics for first 100 predictions:
- [ ] Average response time: ______ seconds
- [ ] Success rate: ______ %
- [ ] Average confidence: ______ %
- [ ] OpenAI cost per prediction: $______

### Data Quality Check
After 1 week:
- [ ] Review prediction quality
- [ ] Check if key_factors are relevant
- [ ] Verify probabilities add up to 100%
- [ ] Ensure analysis is coherent

## Troubleshooting

### Issue: "OpenAI credentials not found"
- [ ] Go to n8n Credentials tab
- [ ] Verify OpenAI credential exists
- [ ] Check API key is valid
- [ ] Re-link credential in workflow

### Issue: "No data from Supabase"
- [ ] Verify team IDs are valid UUIDs
- [ ] Check Supabase anon key in headers
- [ ] Test Supabase endpoint manually
- [ ] Ensure RLS policies allow anon access

### Issue: "Workflow timeout"
- [ ] Check OpenAI API status
- [ ] Verify Supabase performance
- [ ] Increase timeout in n8n settings
- [ ] Test during off-peak hours

### Issue: "Invalid JSON from AI"
- [ ] Check execution logs for raw response
- [ ] Verify prompt includes JSON format
- [ ] Ensure Parse node handles edge cases
- [ ] Consider adjusting temperature (lower = more consistent)

## Optimization

### Week 2 Tasks
- [ ] Review prompt effectiveness
- [ ] Tune temperature/max_tokens if needed
- [ ] Add caching for duplicate requests
- [ ] Implement rate limiting if needed

### Month 1 Tasks
- [ ] Track prediction accuracy vs actual results
- [ ] Calculate ROI if using for betting
- [ ] Identify patterns in successful predictions
- [ ] Refine prompt based on learnings

### Future Enhancements
- [ ] Add head-to-head data
- [ ] Integrate weather data
- [ ] Include betting odds analysis
- [ ] Add referee statistics
- [ ] Implement RAG with team news
- [ ] Build accuracy dashboard

## Sign-Off

Deployment completed by: ___________________
Date: ___________________
Workflow Status: [ ] Active [ ] Testing [ ] Inactive

### Verification
- [ ] Workflow is active in n8n
- [ ] Test prediction successful
- [ ] Integration with Next.js working
- [ ] Documentation reviewed
- [ ] Team notified of deployment

### Notes
```
Add any deployment notes, issues encountered, or special configurations here:






```

---

**Next Review Date**: ___________________
**Responsible Person**: ___________________
**Escalation Contact**: ___________________
