import { NextResponse } from 'next/server'
import { getAllLeagues, getActiveLeagues } from '@/lib/league-context'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const leagues = activeOnly ? await getActiveLeagues() : await getAllLeagues()

    return NextResponse.json(leagues)
  } catch (error) {
    console.error('Error fetching leagues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leagues' },
      { status: 500 }
    )
  }
}
