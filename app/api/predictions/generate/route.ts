import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase/client'

const DEFAULT_WEBHOOK_URL = process.env.N8N_PREDICTION_WEBHOOK || 'https://nn.analyserinsights.com/webhook/football-prediction'
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    // Authentication check
    const cookieStore = cookies()
    const authCookie = cookieStore.get('football_auth')?.value
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { fixture_id, model, custom_prompt } = await request.json()

    if (!fixture_id) {
      return NextResponse.json(
        { error: 'fixture_id is required' },
        { status: 400 }
      )
    }

    // Validate fixture_id is a valid UUID to prevent injection
    if (!UUID_REGEX.test(fixture_id)) {
      return NextResponse.json(
        { error: 'Invalid fixture_id format' },
        { status: 400 }
      )
    }

    // Default model if not provided
    const selectedModel = model || 'openai/gpt-5.2'

    // Use only the default webhook URL (SSRF protection - no custom URLs allowed)
    const webhookUrl = DEFAULT_WEBHOOK_URL

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
    // Include comprehensive learning data for AI to use in predictions
    // Join with teams and fixtures to provide full context about which match was played
    const { data: homeAnalyses } = await supabase
      .from('match_analysis')
      .select(`
        learning_points,
        key_insights,
        surprises,
        factor_accuracy,
        accuracy_score,
        predicted_result,
        actual_result,
        prediction_correct,
        home_team_performance,
        away_team_performance,
        created_at,
        fixture_id,
        home_team:teams!match_analysis_home_team_id_fkey(id, name),
        away_team:teams!match_analysis_away_team_id_fkey(id, name),
        fixture:fixtures!match_analysis_fixture_id_fkey(match_date, round)
      `)
      .or(`home_team_id.eq.${fixtureData.home_team_id},away_team_id.eq.${fixtureData.home_team_id}`)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: awayAnalyses } = await supabase
      .from('match_analysis')
      .select(`
        learning_points,
        key_insights,
        surprises,
        factor_accuracy,
        accuracy_score,
        predicted_result,
        actual_result,
        prediction_correct,
        home_team_performance,
        away_team_performance,
        created_at,
        fixture_id,
        home_team:teams!match_analysis_home_team_id_fkey(id, name),
        away_team:teams!match_analysis_away_team_id_fkey(id, name),
        fixture:fixtures!match_analysis_fixture_id_fkey(match_date, round)
      `)
      .or(`home_team_id.eq.${fixtureData.away_team_id},away_team_id.eq.${fixtureData.away_team_id}`)
      .order('created_at', { ascending: false })
      .limit(5)

    // Trigger n8n webhook for AI prediction
    const webhookPayload = {
      fixture_id: fixtureData.id,
      league_id: fixtureData.league_id,  // Include league_id for predictions table
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
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(WEBHOOK_SECRET && { 'X-Webhook-Secret': WEBHOOK_SECRET }),
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

      let rawResponse
      try {
        rawResponse = await webhookResponse.json()
      } catch (parseError) {
        console.error('Failed to parse n8n response as JSON:', parseError)
        return NextResponse.json({
          success: false,
          error: 'invalid_response',
          message: 'n8n returned invalid JSON response',
        }, { status: 502 })
      }

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
