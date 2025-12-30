import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// GET all leagues (including inactive)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ leagues: data })
  } catch (error) {
    console.error('Error fetching leagues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leagues' },
      { status: 500 }
    )
  }
}

// POST create new league
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiId, name, country, logo, currentSeason, oddsSportKey, isActive, displayOrder } = body

    if (!apiId || !name || !country) {
      return NextResponse.json(
        { error: 'API ID, name, and country are required' },
        { status: 400 }
      )
    }

    // Check if league already exists with this API ID
    const { data: existing } = await supabase
      .from('leagues')
      .select('id')
      .eq('api_id', apiId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'League with this API ID already exists' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('leagues')
      .insert({
        api_id: apiId,
        name,
        country,
        logo: logo || `https://media.api-sports.io/football/leagues/${apiId}.png`,
        current_season: currentSeason || new Date().getFullYear(),
        odds_sport_key: oddsSportKey || null,
        is_active: isActive ?? false,
        display_order: displayOrder ?? 999,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ league: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating league:', error)
    return NextResponse.json(
      { error: 'Failed to create league' },
      { status: 500 }
    )
  }
}

// PATCH update league(s)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, apiId, name, country, logo, currentSeason, oddsSportKey, isActive, displayOrder } = body

    if (!id) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {}
    if (apiId !== undefined) updateData.api_id = apiId
    if (name !== undefined) updateData.name = name
    if (country !== undefined) updateData.country = country
    if (logo !== undefined) updateData.logo = logo
    if (currentSeason !== undefined) updateData.current_season = currentSeason
    if (oddsSportKey !== undefined) updateData.odds_sport_key = oddsSportKey
    if (isActive !== undefined) updateData.is_active = isActive
    if (displayOrder !== undefined) updateData.display_order = displayOrder

    const { data, error } = await supabase
      .from('leagues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ league: data })
  } catch (error) {
    console.error('Error updating league:', error)
    return NextResponse.json(
      { error: 'Failed to update league' },
      { status: 500 }
    )
  }
}
