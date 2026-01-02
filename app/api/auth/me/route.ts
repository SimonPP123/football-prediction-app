import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAuthCookie } from '@/lib/auth/cookie-sign'

export async function GET() {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value

  if (!authCookie) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  // Verify signature and parse cookie data
  const authData = verifyAuthCookie(authCookie)

  if (!authData || !authData.authenticated) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      authenticated: true,
      userId: authData.userId,
      username: authData.username,
      isAdmin: authData.isAdmin
    }
  })
}
