import { NextResponse } from 'next/server'
import { getPredictionHistory } from '@/lib/supabase/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixture_id')

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'fixture_id is required' },
        { status: 400 }
      )
    }

    const history = await getPredictionHistory(fixtureId)

    return NextResponse.json({
      success: true,
      history,
    })
  } catch (error) {
    console.error('Error fetching prediction history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prediction history' },
      { status: 500 }
    )
  }
}
