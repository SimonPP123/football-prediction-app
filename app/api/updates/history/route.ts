import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// GET - Fetch refresh history from database
export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Validate limit parameter to prevent NaN issues
    const limitParam = searchParams.get('limit') || '100'
    const parsedLimit = parseInt(limitParam, 10)
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid limit parameter. Must be a positive integer.' },
        { status: 400 }
      )
    }
    const limit = Math.min(parsedLimit, 500)

    const category = searchParams.get('category')
    const leagueId = searchParams.get('league_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('refresh_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category) {
      query = query.eq('category', category)
    }
    if (leagueId) {
      query = query.eq('league_id', leagueId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching history:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch history',
        history: [],
      }, { status: 500 })
    }

    // Transform database records to match client-side RefreshEvent format
    const history = (data || []).map(record => ({
      id: record.id,
      category: record.category,
      type: record.type,
      status: record.status,
      message: record.message,
      details: record.details,
      leagueId: record.league_id,
      timestamp: record.created_at,
    }))

    return NextResponse.json({
      success: true,
      history,
      total: history.length,
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch history',
      history: [],
    }, { status: 500 })
  }
}

// POST - Log a new refresh event to database
export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    if (!body.category || !body.status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: category and status' },
        { status: 400 }
      )
    }

    // Validate status enum
    if (!['success', 'error', 'pending'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be: success, error, or pending' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('refresh_logs')
      .insert({
        category: body.category,
        type: body.type || 'refresh',
        status: body.status,
        message: body.message || null,
        details: body.details || null,
        league_id: body.leagueId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging event:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to log event',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: data.id,
    })
  } catch (error) {
    console.error('Error logging event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log event' },
      { status: 500 }
    )
  }
}
