import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { savePrediction, savePredictionToHistory, getPrediction } from '@/lib/supabase/queries'

const DEFAULT_WEBHOOK_URL = process.env.N8N_PREDICTION_WEBHOOK || 'https://nn.analyserinsights.com/webhook/football-prediction'

export async function POST(request: Request) {
  try {
    const { fixture_id, webhook_url, model } = await request.json()

    if (!fixture_id) {
      return NextResponse.json(
        { error: 'fixture_id is required' },
        { status: 400 }
      )
    }

    // Default model if not provided
    const selectedModel = model || 'openai/gpt-5.2'

    // Use custom webhook URL if provided, otherwise use default
    const webhookUrl = webhook_url || DEFAULT_WEBHOOK_URL

    // Check if there's an existing prediction - save to history before regenerating
    try {
      const existingPrediction = await getPrediction(fixture_id)
      if (existingPrediction) {
        await savePredictionToHistory(fixture_id)
        console.log(`Saved existing prediction to history for fixture ${fixture_id}`)
      }
    } catch (historyError) {
      console.warn('Could not save to history (table may not exist yet):', historyError)
    }

    // Get fixture details
    const { data: fixture, error: fixtureError } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(*),
        away_team:teams!fixtures_away_team_id_fkey(*),
        venue:venues(*)
      `)
      .eq('id', fixture_id)
      .single()

    if (fixtureError || !fixture) {
      return NextResponse.json(
        { error: 'Fixture not found' },
        { status: 404 }
      )
    }

    // Type assertion for fixture data
    const fixtureData = fixture as any

    // Trigger n8n webhook for AI prediction
    const webhookPayload = {
      fixture_id: fixtureData.id,
      home_team: fixtureData.home_team?.name,
      home_team_id: fixtureData.home_team_id,
      away_team: fixtureData.away_team?.name,
      away_team_id: fixtureData.away_team_id,
      match_date: fixtureData.fixture_date,
      venue: fixtureData.venue?.name,
      round: fixtureData.round,
      model: selectedModel,
    }

    // Set up 5-minute timeout for webhook call
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes

    try {
      console.log(`Calling webhook: ${webhookUrl}`)
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      // Check if webhook returned an error
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text().catch(() => 'Unknown error')
        console.error(`n8n webhook error: ${webhookResponse.status}`, errorText)
        return NextResponse.json({
          success: false,
          error: 'workflow_failed',
          message: `Prediction workflow failed (${webhookResponse.status})`,
        }, { status: 502 })
      }

      const rawResponse = await webhookResponse.json()

      // n8n returns an array, extract the first item
      const prediction = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse

      // Validate that we got a proper prediction response
      if (!prediction || !prediction.prediction) {
        console.error('Invalid n8n response - missing prediction field:', rawResponse)
        return NextResponse.json({
          success: false,
          error: 'invalid_response',
          message: 'Prediction workflow returned incomplete data',
        }, { status: 502 })
      }

      // Map n8n response to our database schema
      // Handle both old format (probabilities object) and new format (flat fields)
      const homeWinPct = prediction.probabilities?.home_win_pct || prediction.home_win_pct
      const drawPct = prediction.probabilities?.draw_pct || prediction.draw_pct
      const awayWinPct = prediction.probabilities?.away_win_pct || prediction.away_win_pct

      // Build factors object - includes A-I breakdown if available, plus quick-access fields
      const factorsData = {
        // A-I Factor breakdown (if provided by AI)
        ...(prediction.factors || {}),
        // Quick-access fields for UI
        home_win_pct: homeWinPct,
        draw_pct: drawPct,
        away_win_pct: awayWinPct,
        over_under: prediction.over_under_2_5,
        btts: prediction.btts,
        value_bet: prediction.value_bet,
      }

      const predictionData = {
        prediction_1x2: prediction.prediction,
        confidence: prediction.confidence_pct,
        overall_index: prediction.overall_index || prediction.confidence_pct, // Use overall_index if available
        home_win_pct: homeWinPct,
        draw_pct: drawPct,
        away_win_pct: awayWinPct,
        over_under: prediction.over_under_2_5,
        btts: prediction.btts,
        value_bet: prediction.value_bet,
        key_factors: prediction.key_factors,
        risk_factors: prediction.risk_factors,
        detailed_analysis: prediction.analysis,
        score_predictions: prediction.score_predictions || null,
        most_likely_score: prediction.most_likely_score || null,
        factors: factorsData, // Full factor breakdown for display
      }

      const saved = await savePrediction(fixture_id, predictionData, selectedModel)

      // Save to history for every prediction
      try {
        await savePredictionToHistory(fixture_id)
      } catch (histErr) {
        console.error('Failed to save prediction to history:', histErr)
        // Non-fatal - prediction was saved, history is a bonus
      }

      return NextResponse.json({
        success: true,
        prediction: saved,
        model_used: selectedModel,
      })
    } catch (webhookError: any) {
      clearTimeout(timeoutId)

      // Check if this is a timeout error
      if (webhookError?.name === 'AbortError') {
        console.error('Webhook timeout after 5 minutes')
        return NextResponse.json({
          success: false,
          error: 'timeout',
          message: 'Prediction generation timed out after 5 minutes. Please try again.',
        }, { status: 408 })
      }

      // Network or other fetch error
      console.error('Webhook error:', webhookError)
      return NextResponse.json({
        success: false,
        error: 'network_error',
        message: webhookError?.message || 'Failed to connect to prediction workflow',
      }, { status: 502 })
    }
  } catch (error) {
    console.error('Error generating prediction:', error)
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    )
  }
}
