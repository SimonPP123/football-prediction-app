import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { hashPassword, validatePassword, validateUsername } from '@/lib/auth/password'
import { isAdminWithSessionValidation, getAuthUserId } from '@/lib/auth'

// GET - List all users
export async function GET() {
  if (!(await isAdminWithSessionValidation())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createServerClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, is_admin, is_active, created_at, updated_at, last_login, created_by')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  return NextResponse.json({ users })
}

// POST - Create new user
export async function POST(request: Request) {
  if (!(await isAdminWithSessionValidation())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let username, password, newUserIsAdmin
  try {
    ({ username, password, isAdmin: newUserIsAdmin } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  try {
    // Validate username
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return NextResponse.json({ error: usernameValidation.error }, { status: 400 })
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 })
    }

    const supabase = createServerClient()
    const adminUserId = getAuthUserId()

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        is_admin: newUserIsAdmin || false,
        is_active: true,
        created_by: adminUserId
      })
      .select('id, username, is_admin, is_active, created_at')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Log the activity
    await supabase.from('user_activity_log').insert({
      user_id: adminUserId,
      action: 'create_user',
      details: { created_username: username, created_user_id: newUser.id }
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error in create user:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
