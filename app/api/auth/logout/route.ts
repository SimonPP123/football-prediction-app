import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAuthCookie } from '@/lib/auth/cookie-sign'

export async function POST() {
  try {
    const cookieStore = cookies()
    const authCookie = cookieStore.get('football_auth')

    // Log the logout activity if user was authenticated
    if (authCookie?.value) {
      const authData = verifyAuthCookie(authCookie.value)
      if (authData?.userId) {
        try {
          const supabase = createServerClient()
          await supabase.from('user_activity_log').insert({
            user_id: authData.userId,
            action: 'logout',
            details: { username: authData.username }
          })
        } catch {
          // Ignore logging errors during logout
        }
      }
    }

    // Clear the auth cookie with matching attributes
    const response = NextResponse.json({ success: true })
    response.cookies.set('football_auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,  // Expire immediately
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}
