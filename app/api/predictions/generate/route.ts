import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

const DEFAULT_WEBHOOK_URL = process.env.N8N_PREDICTION_WEBHOOK || 'https://nn.analyserinsights.com/webhook/football-prediction'

export async function POST(request: Request) {
  try {
    const { fixture_id, webhook_url, model, custom_prompt } = await request.json()

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

    // Fetch recent match analyses for memory context (last 5 for each team)
    const { data: homeAnalyses } = await supabase
      .from('match_analysis')
      .select('learning_points, key_insights, created_at, fixture_id')
      .or(`home_team_id.eq.${fixtureData.home_team_id},away_team_id.eq.${fixtureData.home_team_id}`)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: awayAnalyses } = await supabase
      .from('match_analysis')
      .select('learning_points, key_insights, created_at, fixture_id')
      .or(`home_team_id.eq.${fixtureData.away_team_id},away_team_id.eq.${fixtureData.away_team_id}`)
      .order('created_at', { ascending: false })
      .limit(5)

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
      // Custom prompt override (null means use default in n8n)
      custom_prompt: custom_prompt || null,

      // Memory context from past analyses
      memory_context: {
        home_team_learnings: homeAnalyses || [],
        away_team_learnings: awayAnalyses || []
      }
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

      // n8n workflow will handle saving to database
      // Return success to frontend so it can refresh the data
      console.log(`Prediction generated successfully for fixture ${fixture_id} using model ${selectedModel}`)

      return NextResponse.json({
        success: true,
        message: 'Prediction request sent to n8n workflow. Refresh to see results.',
        fixture_id: fixture_id,
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
