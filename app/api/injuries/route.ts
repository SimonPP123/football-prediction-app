import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get current injuries only:
    // - No return date (still injured) OR return date is in the future
    const { data, error } = await supabase
      .from('injuries')
      .select(`
        *,
        team:teams(id, name, logo),
        player:players(id, name, photo)
      `)
      .or(`expected_return.is.null,expected_return.gte.${today}`)
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log(`[Injuries API] Returning ${data?.length || 0} current injuries`)

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching injuries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch injuries' },
      { status: 500 }
    )
  }
}
