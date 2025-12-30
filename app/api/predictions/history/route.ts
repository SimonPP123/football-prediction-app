import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getPredictionHistory, deletePredictionHistoryRecord, deleteAllPredictionHistory } from '@/lib/supabase/queries'

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

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const cookieStore = cookies()
    const authCookie = cookieStore.get('football_auth')?.value
    if (!authCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const historyId = searchParams.get('history_id')
    const fixtureId = searchParams.get('fixture_id')
    const deleteAll = searchParams.get('delete_all') === 'true'

    // Delete specific history record
    if (historyId) {
      await deletePredictionHistoryRecord(historyId)
      return NextResponse.json({
        success: true,
        message: 'Prediction history record deleted successfully'
      })
    }

    // Delete all history for a fixture
    if (deleteAll && fixtureId) {
      await deleteAllPredictionHistory(fixtureId)
      return NextResponse.json({
        success: true,
        message: 'All prediction history deleted successfully'
      })
    }

    return NextResponse.json(
      { success: false, error: 'history_id or (fixture_id + delete_all=true) is required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error deleting prediction history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete prediction history' },
      { status: 500 }
    )
  }
}
