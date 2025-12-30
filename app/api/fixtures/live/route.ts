import { NextResponse } from 'next/server'
import { getLiveFixtures } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const fixtures = await getLiveFixtures()

    return NextResponse.json(fixtures)
  } catch (error) {
    console.error('Error fetching live fixtures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live fixtures' },
      { status: 500 }
    )
  }
}
