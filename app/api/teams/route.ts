import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get teams with venue and season stats
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        venue:venues(*),
        season_stats:team_season_stats(*)
      `)
      .order('name')

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log(`[Teams API] Fetched ${data?.length || 0} teams`)

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}
