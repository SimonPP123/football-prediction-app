import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

const DEFAULT_WEBHOOK_URL = process.env.N8N_ANALYSIS_WEBHOOK ||
  'https://nn.analyserinsights.com/webhook/post-match-analysis'

export async function POST(request: Request) {
  try {
    const { fixture_id, force_regenerate, model, webhook_url } = await request.json()

    if (!fixture_id) {
      return NextResponse.json({ error: 'fixture_id is required' }, { status: 400 })
    }

    const selectedModel = model || 'openai/gpt-5-mini'
    // Use custom webhook URL if provided, otherwise fall back to default
    const webhookUrl = webhook_url || DEFAULT_WEBHOOK_URL

    // 1. Fetch fixture with FULL details (prediction, stats, events, odds)
    const { data: fixture, error: fixtureError } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:teams!fixtures_home_team_id_fkey(*),
        away_team:teams!fixtures_away_team_id_fkey(*),
        prediction:predictions(*),
        statistics:fixture_statistics(*),
        events:fixture_events(*),
        odds:odds(*)
      `)
      .eq('id', fixture_id)
      .single()

    if (fixtureError || !fixture) {
      return NextResponse.json({ error: 'Fixture not found' }, { status: 404 })
    }

    // Type assertion for fixture data
    const fixtureData = fixture as any

    // 2. Validate fixture is completed
    if (!['FT', 'AET', 'PEN'].includes(fixtureData.status)) {
      return NextResponse.json(
        { error: 'Match not completed yet' },
        { status: 400 }
      )
    }

    // 3. Check if analysis exists (unless force_regenerate)
    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from('match_analysis')
        .select('id')
        .eq('fixture_id', fixture_id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Analysis already exists. Use force_regenerate=true to overwrite.' },
          { status: 409 }
        )
      }
    }

    // 4. Prepare webhook payload
    const prediction = Array.isArray(fixtureData.prediction)
      ? fixtureData.prediction[0]
      : fixtureData.prediction

    const webhookPayload = {
      fixture_id: fixtureData.id,
      home_team: fixtureData.home_team.name,
      home_team_id: fixtureData.home_team_id,
      away_team: fixtureData.away_team.name,
      away_team_id: fixtureData.away_team_id,
      actual_score: `${fixtureData.goals_home}-${fixtureData.goals_away}`,
      match_date: fixtureData.match_date,
      prediction: prediction,
      statistics: fixtureData.statistics,
      events: fixtureData.events,
      odds: fixtureData.odds,
      model: selectedModel
    }

    // 5. Call n8n webhook with 5-minute timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000)

    try {
      console.log(`Calling analysis webhook: ${webhookUrl}`)
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text().catch(() => 'Unknown error')
        console.error(`n8n webhook error: ${webhookResponse.status}`, errorText)
        return NextResponse.json({
          success: false,
          error: 'workflow_failed',
          message: `Analysis workflow failed (${webhookResponse.status})`
        }, { status: 502 })
      }

      const result = await webhookResponse.json()
      const analysis = Array.isArray(result) ? result[0] : result

      console.log(`Analysis generated for fixture ${fixture_id} using ${selectedModel}`)

      return NextResponse.json({
        success: true,
        message: 'Analysis generated successfully',
        fixture_id,
        analysis_id: analysis.id,
        model_used: selectedModel
      })

    } catch (webhookError: any) {
      clearTimeout(timeoutId)

      if (webhookError?.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'timeout',
          message: 'Analysis generation timed out after 5 minutes'
        }, { status: 408 })
      }

      console.error('Webhook error:', webhookError)
      return NextResponse.json({
        success: false,
        error: 'network_error',
        message: webhookError?.message || 'Failed to connect to analysis workflow'
      }, { status: 502 })
    }

  } catch (error) {
    console.error('Error generating analysis:', error)
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }
}
