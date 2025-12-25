import { NextResponse } from 'next/server'
import { getRecentCompletedWithPredictions } from '@/lib/supabase/queries'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rounds = parseInt(searchParams.get('rounds') || '2')

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
