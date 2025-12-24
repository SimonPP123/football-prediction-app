/**
 * Test script for Football Prediction AI workflow
 *
 * Usage:
 *   npx tsx scripts/test-prediction-workflow.ts
 */

import 'dotenv/config';

const WEBHOOK_URL = process.env.N8N_PREDICTION_WEBHOOK_URL || 'https://nn.analyserinsights.com/webhook/football-prediction';

interface PredictionRequest {
  fixture_id: string;
  home_team: string;
  home_team_id: string;
  away_team: string;
  away_team_id: string;
  match_date: string;
  venue: string;
  round: string;
}

interface PredictionResponse {
  fixture_id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  venue: string;
  prediction: '1' | 'X' | '2';
  confidence_pct: number;
  probabilities: {
    home_win_pct: number;
    draw_pct: number;
    away_win_pct: number;
  };
  over_under_2_5: 'Over' | 'Under';
  btts: 'Yes' | 'No';
  value_bet: string | null;
  key_factors: string[];
  risk_factors: string[];
  analysis: string;
  generated_at: string;
}

async function testPrediction(request: PredictionRequest): Promise<PredictionResponse> {
  console.log('\n📊 Testing Football Prediction AI Workflow');
  console.log('=' .repeat(60));
  console.log(`Match: ${request.home_team} vs ${request.away_team}`);
  console.log(`Venue: ${request.venue}`);
  console.log(`Date: ${request.match_date}`);
  console.log('=' .repeat(60));

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const prediction: PredictionResponse = await response.json();

    console.log('\n✅ Prediction Generated Successfully!\n');

    // Display prediction
    const predictionLabel =
      prediction.prediction === '1' ? `${request.home_team} Win` :
      prediction.prediction === 'X' ? 'Draw' :
      `${request.away_team} Win`;

    console.log(`🎯 PREDICTION: ${predictionLabel} (${prediction.confidence_pct}% confidence)`);
    console.log('');
    console.log('📊 PROBABILITIES:');
    console.log(`   Home Win: ${prediction.probabilities.home_win_pct}%`);
    console.log(`   Draw:     ${prediction.probabilities.draw_pct}%`);
    console.log(`   Away Win: ${prediction.probabilities.away_win_pct}%`);
    console.log('');
    console.log(`⚽ Over/Under 2.5 Goals: ${prediction.over_under_2_5}`);
    console.log(`🥅 Both Teams to Score: ${prediction.btts}`);

    if (prediction.value_bet) {
      console.log(`💰 Value Bet: ${prediction.value_bet}`);
    }

    console.log('');
    console.log('🔑 KEY FACTORS:');
    prediction.key_factors.forEach((factor, i) => {
      console.log(`   ${i + 1}. ${factor}`);
    });

    if (prediction.risk_factors.length > 0) {
      console.log('');
      console.log('⚠️  RISK FACTORS:');
      prediction.risk_factors.forEach((risk, i) => {
        console.log(`   ${i + 1}. ${risk}`);
      });
    }

    console.log('');
    console.log('📝 ANALYSIS:');
    console.log(`   ${prediction.analysis}`);
    console.log('');
    console.log('=' .repeat(60));
    console.log(`Generated at: ${prediction.generated_at}`);
    console.log('=' .repeat(60));

    return prediction;

  } catch (error) {
    console.error('\n❌ Error testing prediction workflow:');
    console.error(error);
    throw error;
  }
}

// Example test case - UPDATE THESE WITH REAL TEAM IDs FROM YOUR DATABASE
async function main() {
  const testRequest: PredictionRequest = {
    fixture_id: 'test-fixture-' + Date.now(),
    home_team: 'Liverpool',
    home_team_id: 'REPLACE_WITH_REAL_LIVERPOOL_UUID', // Get from database
    away_team: 'Arsenal',
    away_team_id: 'REPLACE_WITH_REAL_ARSENAL_UUID',   // Get from database
    match_date: '2025-12-26T15:00:00Z',
    venue: 'Anfield',
    round: 'Regular Season - 18',
  };

  console.log('\n⚠️  NOTE: Update team_id values in this script with real UUIDs from your database');
  console.log('   You can get them by running:');
  console.log('   SELECT id, name FROM teams WHERE name IN (\'Liverpool\', \'Arsenal\');\n');

  // Uncomment when you have real team IDs
  // await testPrediction(testRequest);

  console.log('Script ready. Update team IDs and uncomment the line above to test.\n');
}

main().catch(console.error);
