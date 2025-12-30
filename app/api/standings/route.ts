import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: standings, error } = await supabase
      .from('standings')
      .select(`
        id,
        team_id,
        rank,
        points,
        goal_diff,
        form,
        description,
        played,
        won,
        drawn,
        lost,
        goals_for,
        goals_against,
        home_record,
        away_record,
        team:teams(id, name, logo, code, api_id)
      `)
      .order('rank', { ascending: true })

    if (error) {
      console.error('[API Standings] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(standings || [])
  } catch (error) {
    console.error('[API Standings] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
