import { NextRequest, NextResponse } from 'next/server'
import { getPredictionHistory, deletePredictionHistoryRecord, deleteAllPredictionHistory } from '@/lib/supabase/queries'
import { isValidUUID } from '@/lib/validation'
import { isAdminWithSessionValidation } from '@/lib/auth'

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

    // Validate fixture_id format
    if (!isValidUUID(fixtureId)) {
      return NextResponse.json(
        { error: 'Invalid fixture_id format' },
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
    // Admin-only: Prediction history is system-generated, deletion requires admin access
    if (!(await isAdminWithSessionValidation())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const historyId = searchParams.get('history_id')
    const fixtureId = searchParams.get('fixture_id')
    const deleteAll = searchParams.get('delete_all') === 'true'

    // Validate IDs if provided
    if (historyId && !isValidUUID(historyId)) {
      return NextResponse.json(
        { error: 'Invalid history_id format' },
        { status: 400 }
      )
    }
    if (fixtureId && !isValidUUID(fixtureId)) {
      return NextResponse.json(
        { error: 'Invalid fixture_id format' },
        { status: 400 }
      )
    }

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
