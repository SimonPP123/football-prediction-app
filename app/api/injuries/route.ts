import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get recent injuries (created within last 30 days, or no fixture yet completed)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('injuries')
      .select(`
        *,
        team:teams(id, name, logo)
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
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
