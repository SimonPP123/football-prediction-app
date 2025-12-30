import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statType = searchParams.get('type') || 'goals'

    // Map stat type to category in top_performers table
    const categoryMap: Record<string, string> = {
      goals: 'goals',
      assists: 'assists',
      yellow_cards: 'yellow_cards',
      red_cards: 'red_cards',
    }

    const category = categoryMap[statType]
    if (!category) {
      return NextResponse.json({ error: 'Invalid stat type' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('top_performers')
      .select('*')
      .eq('category', category)
      .eq('season', 2025)
      .order('rank', { ascending: true })
      .limit(20)

    if (error) throw error

    // Transform to expected format
    const players = (data || []).map(p => ({
      id: p.id,
      player_name: p.player_name,
      player_photo: p.player_photo,
      team_name: p.team_name,
      team_logo: p.team_logo,
      value: p.value,
      appearances: p.appearances,
    }))

    return NextResponse.json(players)
  } catch (error) {
    console.error('Error fetching player stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    )
  }
}
