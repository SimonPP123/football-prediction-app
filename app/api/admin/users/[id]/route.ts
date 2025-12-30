import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/client'
import { hashPassword, validatePassword } from '@/lib/auth/password'

// Helper to check if request is from admin
function isAdmin(): boolean {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  if (!authCookie) return false

  try {
    const authData = JSON.parse(authCookie)
    return authData.isAdmin === true
  } catch {
    return false
  }
}

function getAdminUserId(): string | null {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  if (!authCookie) return null

  try {
    const authData = JSON.parse(authCookie)
    return authData.userId || null
  } catch {
    return null
  }
}

interface RouteParams {
  params: { id: string }
}

// GET - Get single user
export async function GET(request: Request, { params }: RouteParams) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createServerClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, is_admin, is_active, created_at, updated_at, last_login, created_by')
    .eq('id', params.id)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

// PATCH - Update user (password, admin status, active status)
export async function PATCH(request: Request, { params }: RouteParams) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const adminUserId = getAdminUserId()

  let password, newIsAdmin, isActive
  try {
    ({ password, isAdmin: newIsAdmin, isActive } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  // Prevent admin from deactivating themselves
  if (params.id === adminUserId && isActive === false) {
    return NextResponse.json(
      { error: 'Cannot deactivate your own account' },
      { status: 400 }
    )
  }

  try {

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // Update password if provided
    if (password) {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: passwordValidation.error }, { status: 400 })
      }
      updates.password_hash = await hashPassword(password)
    }

    // Update admin status if provided
    if (typeof newIsAdmin === 'boolean') {
      // Prevent removing admin from self
      if (params.id === adminUserId && newIsAdmin === false) {
        return NextResponse.json(
          { error: 'Cannot remove admin privileges from your own account' },
          { status: 400 }
        )
      }
      updates.is_admin = newIsAdmin
    }

    // Update active status if provided
    if (typeof isActive === 'boolean') {
      updates.is_active = isActive
    }

    const supabase = createServerClient()

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', params.id)
      .select('id, username, is_admin, is_active, updated_at')
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Log the activity
    await supabase.from('user_activity_log').insert({
      user_id: adminUserId,
      action: 'update_user',
      details: {
        updated_user_id: params.id,
        updated_username: user.username,
        changes: {
          password_changed: !!password,
          is_admin: typeof newIsAdmin === 'boolean' ? newIsAdmin : undefined,
          is_active: typeof isActive === 'boolean' ? isActive : undefined
        }
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error in update user:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// DELETE - Soft delete user (set is_active to false)
export async function DELETE(request: Request, { params }: RouteParams) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const adminUserId = getAdminUserId()

  // Prevent admin from deleting themselves
  if (params.id === adminUserId) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  // Get user info before soft delete
  const { data: user } = await supabase
    .from('users')
    .select('username')
    .eq('id', params.id)
    .single()

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }

  // Log the activity
  await supabase.from('user_activity_log').insert({
    user_id: adminUserId,
    action: 'delete_user',
    details: {
      deleted_user_id: params.id,
      deleted_username: user?.username
    }
  })

  return NextResponse.json({ success: true })
}
