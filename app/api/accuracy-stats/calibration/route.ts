import { NextRequest, NextResponse } from 'next/server'
import { getCalibrationData } from '@/lib/supabase/queries'
import { getLeagueFromRequest } from '@/lib/league-context'

export async function GET(request: NextRequest) {
  try {
    const league = await getLeagueFromRequest(request)
    const leagueId = league?.id || undefined

    const data = await getCalibrationData(leagueId)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching calibration data:', error)
    return NextResponse.json({ error: 'Failed to fetch calibration data' }, { status: 500 })
  }
}
