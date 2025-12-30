import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('league_id')
    const teamId = searchParams.get('team_id')

    // Get recent injuries (created within last 30 days, or no fixture yet completed)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let query = supabase
      .from('injuries')
      .select(`
        *,
        team:teams(id, name, logo, league_id)
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Filter by team_id if specified (direct filter, most efficient)
    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    // Filter by league via team's league_id if specified
    // Note: This requires a join filter which Supabase supports
    if (leagueId) {
      query = query.eq('team.league_id', leagueId)
    }

    const { data, error } = await query

    if (error) throw error

    // Filter out results where team doesn't match league (for the join filter)
    let filteredData = data
    if (leagueId && !teamId) {
      filteredData = data?.filter((injury: any) => injury.team?.league_id === leagueId)
    }

    console.log(`[Injuries API] Returning ${filteredData?.length || 0} current injuries${teamId ? ` for team ${teamId}` : leagueId ? ` for league ${leagueId}` : ''}`)

    return NextResponse.json(filteredData || [])
  } catch (error) {
    console.error('Error fetching injuries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch injuries' },
      { status: 500 }
    )
  }
}
