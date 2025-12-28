import { NextResponse } from 'next/server'
import { getAccuracyByModel } from '@/lib/supabase/queries'

export async function GET() {
  try {
    const stats = await getAccuracyByModel()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching accuracy by model:', error)
    return NextResponse.json({ error: 'Failed to fetch accuracy by model' }, { status: 500 })
  }
}
