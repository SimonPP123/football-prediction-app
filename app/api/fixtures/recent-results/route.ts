import { NextResponse } from 'next/server'
import { getRecentCompletedWithPredictions } from '@/lib/supabase/queries'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roundsParam = searchParams.get('rounds') || '2'

    // Support 'all' parameter to fetch all historical results
    const rounds = roundsParam === 'all' ? 'all' : parseInt(roundsParam)

    const results = await getRecentCompletedWithPredictions(rounds)

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching recent results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent results' },
      { status: 500 }
    )
  }
}
