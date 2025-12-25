import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: fixtures, error } = await supabase
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
