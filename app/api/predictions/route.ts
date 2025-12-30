import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deletePrediction } from '@/lib/supabase/queries'

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const cookieStore = cookies()
    const authCookie = cookieStore.get('football_auth')?.value
    if (!authCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixture_id')

    if (!fixtureId) {
      return NextResponse.json(
        { success: false, error: 'fixture_id is required' },
        { status: 400 }
      )
    }

    await deletePrediction(fixtureId)

    return NextResponse.json({
      success: true,
      message: 'Prediction deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting prediction:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete prediction' },
      { status: 500 }
    )
  }
}
