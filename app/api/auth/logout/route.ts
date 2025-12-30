import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/client'

export async function POST() {
  try {
    const cookieStore = cookies()
    const authCookie = cookieStore.get('football_auth')

    // Log the logout activity if user was authenticated
    if (authCookie?.value) {
      try {
        const authData = JSON.parse(authCookie.value)
        if (authData.userId) {
          const supabase = createServerClient()
          await supabase.from('user_activity_log').insert({
            user_id: authData.userId,
            action: 'logout',
            details: { username: authData.username }
          })
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Clear the auth cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete('football_auth')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}
