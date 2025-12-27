import { NextResponse } from 'next/server'
import { supabase, createServerClient } from '@/lib/supabase/client'

export async function GET(
  request: Request,
  { params }: { params: { fixture_id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('match_analysis')
      .select('*')
      .eq('fixture_id', params.fixture_id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching analysis:', error)
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 })
  }
}

// DELETE handler for regeneration workflow
export async function DELETE(
  request: Request,
  { params }: { params: { fixture_id: string } }
) {
  try {
    const serverSupabase = createServerClient()

    const { error } = await serverSupabase
      .from('match_analysis')
      .delete()
      .eq('fixture_id', params.fixture_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting analysis:', error)
    return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 })
  }
}
