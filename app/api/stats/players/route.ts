import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { SEASON } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statType = searchParams.get('type') || 'goals'
    const leagueId = searchParams.get('league_id')

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

    // Get the season from the league's current_season, fallback to default
    let season = SEASON
    if (leagueId) {
      const { data: league } = await supabase
        .from('leagues')
        .select('current_season')
        .eq('id', leagueId)
        .single()
      if (league?.current_season) {
        season = league.current_season
      }
    }

    let query = supabase
      .from('top_performers')
      .select('*')
      .eq('category', category)
      .eq('season', season)
      .order('rank', { ascending: true })
      .limit(20)

    // Filter by league if provided
    if (leagueId) {
      query = query.eq('league_id', leagueId)
    }

    const { data, error } = await query

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
