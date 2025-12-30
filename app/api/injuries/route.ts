import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('injuries')
      .select(`
        *,
        team:teams(id, name, logo),
        player:players(id, name, photo)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching injuries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch injuries' },
      { status: 500 }
    )
  }
}
