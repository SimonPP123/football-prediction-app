import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { verifyPassword } from '@/lib/auth/password'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, is_admin, is_active')
      .eq('username', username)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact an administrator.' },
        { status: 401 }
      )
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Log the login activity
    await supabase.from('user_activity_log').insert({
      user_id: user.id,
      action: 'login',
      details: { username: user.username }
    })

    // Set cookie with user info (JSON encoded)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin
      }
    })

    response.cookies.set('football_auth', JSON.stringify({
      authenticated: true,
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
