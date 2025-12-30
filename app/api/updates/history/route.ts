import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Note: This endpoint returns history stored in the client's localStorage
// The actual history is managed by the UpdateProvider context
// This endpoint is here as a placeholder for future server-side history tracking

export async function GET() {
  // For now, return empty history as the client manages its own history
  // In the future, this could query a refresh_logs table in Supabase
  return NextResponse.json({
    success: true,
    history: [],
    message: 'History is currently stored client-side. Use UpdateProvider context for history.',
  })
}

// Future: POST endpoint to log refresh events server-side
export async function POST(request: Request) {
  try {
    const event = await request.json()

    // Validate event structure
    if (!event.category || !event.status || !event.message) {
      return NextResponse.json(
        { success: false, error: 'Invalid event structure' },
        { status: 400 }
      )
    }

    // For now, just acknowledge receipt
    // In the future, this could insert into a refresh_logs table
    return NextResponse.json({
      success: true,
      message: 'Event logged (client-side only for now)',
    })
  } catch (error) {
    console.error('Error logging event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log event' },
      { status: 500 }
    )
  }
}
