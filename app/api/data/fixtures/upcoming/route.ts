import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLeagueFromRequest } from '@/lib/league-context'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    // Get league from request (query param or cookie)
    const league = await getLeagueFromRequest(request)

    let query = supabase
      .from('fixtures')
      .select(`
        id, api_id, match_date, round,
        home_team:teams!fixtures_home_team_id_fkey(name, logo),
        away_team:teams!fixtures_away_team_id_fkey(name, logo)
      `)
      .gte('match_date', new Date().toISOString())
      .eq('status', 'NS')
      .order('match_date', { ascending: true })
      .limit(20)

    // Filter by league if available
    if (league?.id) {
      query = query.eq('league_id', league.id)
    }

    const { data: fixtures, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ fixtures: fixtures || [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
