import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value

  if (!authCookie) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  try {
    const authData = JSON.parse(authCookie)

    if (!authData.authenticated) {
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
  } catch {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
