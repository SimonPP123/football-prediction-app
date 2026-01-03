import { NextRequest, NextResponse } from 'next/server'
import { getAccuracyByModel } from '@/lib/supabase/queries'
import { getLeagueFromRequest } from '@/lib/league-context'

export async function GET(request: NextRequest) {
  try {
    const league = await getLeagueFromRequest(request)
    const leagueId = league?.id || undefined

    const stats = await getAccuracyByModel(leagueId)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching accuracy by model:', error)
    return NextResponse.json({ error: 'Failed to fetch accuracy by model' }, { status: 500 })
  }
}
