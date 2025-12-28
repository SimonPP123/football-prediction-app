import { NextResponse } from 'next/server'
import { getCalibrationData } from '@/lib/supabase/queries'

export async function GET() {
  try {
    const data = await getCalibrationData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching calibration data:', error)
    return NextResponse.json({ error: 'Failed to fetch calibration data' }, { status: 500 })
  }
}
