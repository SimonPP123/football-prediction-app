# Football Prediction AI Workflow

## Overview
This n8n workflow provides AI-powered match predictions for Premier League football matches using GPT-4o and comprehensive team data from Supabase.

## Workflow File
`Football_Prediction_AI.json`

## Installation

1. Log in to n8n at https://nn.analyserinsights.com/
2. Click on "Workflows" in the left menu
3. Click "Import from File" button
4. Select the `Football_Prediction_AI.json` file
5. Configure the OpenAI credentials (if not already set up)
6. Activate the workflow

## Webhook Endpoint

Once deployed, the webhook will be available at:
```
https://nn.analyserinsights.com/webhook/football-prediction
```

## Request Format

**Method:** POST
**Content-Type:** application/json

**Payload:**
```json
{
  "fixture_id": "550e8400-e29b-41d4-a716-446655440000",
  "home_team": "Liverpool",
  "home_team_id": "550e8400-e29b-41d4-a716-446655440001",
  "away_team": "Arsenal",
  "away_team_id": "550e8400-e29b-41d4-a716-446655440002",
  "match_date": "2025-12-26T15:00:00Z",
  "venue": "Anfield",
  "round": "Regular Season - 18"
}
```

## Response Format

```json
{
  "fixture_id": "550e8400-e29b-41d4-a716-446655440000",
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
    "Arsenal's recent defensive issues",
    "Liverpool's high pressing effectiveness"
  ],
  "risk_factors": [
    "Arsenal's counter-attacking threat",
    "Key injuries in Liverpool's defense"
  ],
  "analysis": "Liverpool enters this fixture with significant momentum...",
  "generated_at": "2025-12-24T10:30:00.000Z"
}
```

## Prediction Values

- **prediction**:
  - `"1"` = Home Win
  - `"X"` = Draw
  - `"2"` = Away Win

- **confidence_pct**: 0-100 (higher = more confident)

- **over_under_2_5**: `"Over"` or `"Under"` for total goals

- **btts**: `"Yes"` or `"No"` for Both Teams To Score

- **value_bet**: Suggested bet with odds, or `null` if no value identified

## Workflow Architecture

### 1. Webhook Trigger
Receives the match details and team IDs

### 2. Data Fetching Nodes (Parallel)
- **Fetch Home Team Stats**: Season statistics for home team
- **Fetch Away Team Stats**: Season statistics for away team

### 3. Form & Context Nodes
- **Fetch Home Team Form**: Last 5 matches
- **Fetch Away Team Form**: Last 5 matches
- **Fetch Injuries**: Current injury list for both teams
- **Fetch Standings**: League table positions

### 4. AI Processing
- **Build AI Prompt**: Combines all data into comprehensive prompt
- **OpenAI Analysis**: GPT-4o generates prediction
- **Parse AI Response**: Extracts structured JSON from AI response

### 5. Response
- **Webhook Response**: Returns prediction to caller

## Data Sources

All data is fetched from Supabase using the REST API:
- Base URL: `https://ypddcrvjeeqavqpcypoa.supabase.co/rest/v1`
- Authentication: Anon key in headers

### Tables Used:
1. `team_season_stats` - Aggregated season statistics
2. `fixtures` - Match history for form analysis
3. `injuries` - Current injury status
4. `standings` - League table positions

## AI Considerations

The workflow uses GPT-4o with:
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Max Tokens**: 2000 (sufficient for detailed analysis)

The prompt instructs the AI to analyze:
- Team form and momentum
- Home advantage
- Injury impact
- Head-to-head history
- Tactical matchups
- League position and motivation
- xG trends
- Defensive/offensive strength

## Testing

Test the workflow using curl:

```bash
curl -X POST https://nn.analyserinsights.com/webhook/football-prediction \
  -H "Content-Type: application/json" \
  -d '{
    "fixture_id": "test-fixture-id",
    "home_team": "Liverpool",
    "home_team_id": "your-home-team-uuid",
    "away_team": "Arsenal",
    "away_team_id": "your-away-team-uuid",
    "match_date": "2025-12-26T15:00:00Z",
    "venue": "Anfield",
    "round": "Regular Season - 18"
  }'
```

## Error Handling

The workflow will return errors if:
- Invalid team IDs (no data found in Supabase)
- OpenAI API errors (rate limits, API key issues)
- Malformed JSON response from AI
- Missing required webhook parameters

## Integration

This workflow can be integrated with:
1. **Next.js Frontend**: Call from API routes or server actions
2. **Other n8n Workflows**: Trigger predictions for upcoming matches
3. **Scheduled Jobs**: Run predictions for all weekend fixtures
4. **Database Storage**: Save predictions to `predictions` table

## Maintenance

- **OpenAI Costs**: Monitor token usage in OpenAI dashboard
- **Rate Limits**: GPT-4o has rate limits based on your OpenAI plan
- **Data Freshness**: Ensure sync workflows are running to keep data current
- **Prompt Tuning**: Adjust prompt in "Build AI Prompt" node for better results

## Future Enhancements

Potential improvements:
1. Add head-to-head data fetching
2. Include weather data in analysis
3. Fetch and analyze betting odds
4. Add referee statistics
5. Store predictions in database for tracking accuracy
6. Implement RAG with recent team news articles
7. Add confidence scoring based on data completeness
