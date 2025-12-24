import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { savePrediction } from '@/lib/supabase/queries'

const DEFAULT_WEBHOOK_URL = process.env.N8N_PREDICTION_WEBHOOK || 'https://nn.analyserinsights.com/webhook/football-prediction'

export async function POST(request: Request) {
  try {
    const { fixture_id, webhook_url } = await request.json()

    if (!fixture_id) {
      return NextResponse.json(
        { error: 'fixture_id is required' },
        { status: 400 }
      )
    }

    // Use custom webhook URL if provided, otherwise use default
    const webhookUrl = webhook_url || DEFAULT_WEBHOOK_URL

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
    }

    try {
      console.log(`Calling webhook: ${webhookUrl}`)
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      })

      if (webhookResponse.ok) {
        const rawResponse = await webhookResponse.json()

        // n8n returns an array, extract the first item
        const prediction = Array.isArray(rawResponse) ? rawResponse[0] : rawResponse

        // Save prediction to database
        // The new workflow returns: prediction, confidence_pct, probabilities, etc.
        if (prediction && prediction.prediction) {
          // Map n8n response to our database schema
          const predictionData = {
            prediction_1x2: prediction.prediction,
            confidence: prediction.confidence_pct,
            home_win_pct: prediction.probabilities.home_win_pct,
            draw_pct: prediction.probabilities.draw_pct,
            away_win_pct: prediction.probabilities.away_win_pct,
            over_under: prediction.over_under_2_5,
            btts: prediction.btts,
            value_bet: prediction.value_bet,
            key_factors: prediction.key_factors,
            risk_factors: prediction.risk_factors,
            detailed_analysis: prediction.analysis,
          }

          const saved = await savePrediction(fixture_id, predictionData)
          return NextResponse.json({
            success: true,
            prediction: saved,
          })
        }
      }
    } catch (webhookError) {
      console.error('Webhook error (n8n might not be configured yet):', webhookError)
      // Fall through to placeholder prediction
    }

    // If webhook fails or n8n not configured, create a placeholder prediction
    // This allows testing the UI before n8n workflow is set up
    const placeholderPrediction = {
      prediction_1x2: '1',
      confidence: 50,
      home_win_pct: 40,
      draw_pct: 30,
      away_win_pct: 30,
      over_under: 'Under 2.5',
      btts: 'No',
      value_bet: null,
      key_factors: [
        'Prediction pending AI analysis',
        'n8n workflow not yet configured'
      ],
      risk_factors: [
        'This is a placeholder prediction',
        'Configure n8n workflow for real analysis'
      ],
      detailed_analysis: 'This is a placeholder prediction. The n8n AI workflow has not been configured yet. Once set up, this will contain detailed AI-generated analysis based on team form, head-to-head records, injuries, and other factors.',
    }

    const saved = await savePrediction(fixture_id, placeholderPrediction)

    return NextResponse.json({
      success: true,
      prediction: saved,
      placeholder: true,
    })
  } catch (error) {
    console.error('Error generating prediction:', error)
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    )
  }
}
