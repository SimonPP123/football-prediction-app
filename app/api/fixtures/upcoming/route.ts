import { NextResponse } from 'next/server'
import { getUpcomingFixtures } from '@/lib/supabase/queries'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : undefined

    const fixtures = await getUpcomingFixtures(limit)

    return NextResponse.json(fixtures)
  } catch (error) {
    console.error('Error fetching upcoming fixtures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fixtures' },
      { status: 500 }
    )
  }
}
