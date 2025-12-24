# Import Guide - Football Prediction AI Workflow

## Step-by-Step Instructions

### 1. Access n8n Dashboard
Navigate to: https://nn.analyserinsights.com/

### 2. Import the Workflow

1. Click on **"Workflows"** in the left sidebar
2. Click the **"+"** button or **"Import from File"** button
3. Select the file: `Football_Prediction_AI.json`
4. The workflow will open in the editor

### 3. Configure OpenAI Credentials

The workflow uses OpenAI GPT-4o. You need to set up credentials:

1. Click on the **"OpenAI Analysis"** node
2. In the credentials section, select or create OpenAI credentials:
   - If credentials already exist, select them
   - If not, click **"Create New Credential"**:
     - Name: `OpenAI API`
     - API Key: Your OpenAI API key
     - Click **Save**

### 4. Verify Webhook Settings

1. Click on the **"Webhook"** node at the start
2. Verify the path is set to: `football-prediction`
3. Note the full webhook URL (will be shown in the node)
4. Example: `https://nn.analyserinsights.com/webhook/football-prediction`

### 5. Test HTTP Request Nodes

Before activating, you can test individual nodes:

1. Click on the **"Fetch Home Team Stats"** node
2. Click the **"Execute Node"** button
3. This requires manual test data - we'll do end-to-end testing later

### 6. Activate the Workflow

1. Click the **toggle switch** in the top right to activate
2. The workflow status should change to **"Active"**
3. The webhook is now live and ready to receive requests

### 7. Copy Webhook URL

1. Click on the **"Webhook"** node
2. Copy the **Production URL** shown
3. Update your `.env.local` file:
   ```
   N8N_PREDICTION_WEBHOOK_URL=https://nn.analyserinsights.com/webhook/football-prediction
   ```

### 8. Test the Workflow

#### Option A: Using the Test Script

1. First, get real team IDs from Supabase:
   ```sql
   SELECT id, name FROM teams WHERE name IN ('Liverpool', 'Arsenal');
   ```

2. Update the test script at `scripts/test-prediction-workflow.ts`:
   - Replace `REPLACE_WITH_REAL_LIVERPOOL_UUID` with Liverpool's ID
   - Replace `REPLACE_WITH_REAL_ARSENAL_UUID` with Arsenal's ID
   - Uncomment the `await testPrediction(testRequest)` line

3. Run the test:
   ```bash
   npx tsx scripts/test-prediction-workflow.ts
   ```

#### Option B: Using curl

```bash
# Get team IDs first from Supabase
# Then run:

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

#### Option C: Using n8n's Built-in Test

1. In n8n editor, click on the **"Webhook"** node
2. Click **"Listen for Test Event"**
3. In another terminal, send a POST request using curl
4. You'll see the execution flow through the nodes in real-time

## Troubleshooting

### Error: "OpenAI credentials not found"
- Make sure you've configured OpenAI credentials in step 3
- The credential name must match what's referenced in the workflow

### Error: "No data returned from Supabase"
- Check that the team IDs are valid UUIDs in your database
- Verify the Supabase anon key is correct in the HTTP Request nodes
- Test Supabase connectivity by visiting:
  ```
  https://ypddcrvjeeqavqpcypoa.supabase.co/rest/v1/teams?select=*&limit=1
  ```
  with the Authorization header

### Error: "Invalid JSON response from AI"
- The AI occasionally formats JSON incorrectly
- The "Parse AI Response" node includes error handling for this
- Check the execution log to see the raw AI response

### Workflow doesn't activate
- Check that all required nodes have valid configurations
- Ensure the OpenAI credential is properly set
- Look for red error icons on any nodes

## Monitoring

### View Execution History
1. Go to **Executions** in the left sidebar
2. You'll see all webhook calls and their results
3. Click any execution to see the data flow through each node

### Check Logs
Each node shows:
- Input data received
- Output data produced
- Execution time
- Any errors

### Performance Metrics
Track:
- **Response Time**: Typically 5-15 seconds for full prediction
- **Success Rate**: % of executions that complete without errors
- **OpenAI Costs**: Monitor token usage in OpenAI dashboard

## Next Steps

After successful deployment:

1. **Integrate with Frontend**: Call the webhook from your Next.js app
2. **Store Predictions**: Add a node to save predictions to Supabase
3. **Add Error Notifications**: Configure email/Slack alerts for failures
4. **Enhance Prompt**: Tune the AI prompt based on prediction quality
5. **Add Caching**: Cache predictions for the same fixture to save costs

## Workflow Updates

To update the workflow later:

1. Make changes in the n8n editor
2. Click **Save** to save changes
3. Export updated workflow: **Workflow > Export**
4. Replace `Football_Prediction_AI.json` with the new version
5. Commit to version control

## Security Notes

- The Supabase anon key is embedded in HTTP Request nodes
- This is safe for read-only operations on public data
- If you expose sensitive data, use Supabase RLS policies
- The OpenAI API key is stored securely in n8n credentials
- Never commit the exported workflow to public repos if it contains secrets

## Support

If you encounter issues:

1. Check the n8n execution logs
2. Verify all credentials are configured
3. Test Supabase connectivity separately
4. Check OpenAI API status: https://status.openai.com/
5. Review the n8n community forum: https://community.n8n.io/
