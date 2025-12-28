import { NextResponse } from 'next/server'
import { getAnalysisAccuracyStats } from '@/lib/supabase/queries'

export async function GET() {
  try {
    const stats = await getAnalysisAccuracyStats()

    if (!stats) {
      return NextResponse.json({
        total: 0,
        result_accuracy: 0,
        score_accuracy: 0,
        over_under_accuracy: 0,
        btts_accuracy: 0,
        average_accuracy: 0
      })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching accuracy stats:', error)
    return NextResponse.json({ error: 'Failed to fetch accuracy stats' }, { status: 500 })
  }
}
