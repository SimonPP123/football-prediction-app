import { NextResponse } from 'next/server'

const VALID_USERNAME = 'predictme'
const VALID_PASSWORD = 'KraskataiMonkata98'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const response = NextResponse.json({ success: true })

      // Set auth cookie (httpOnly for security)
      response.cookies.set('football_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })

      return response
    }

    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
