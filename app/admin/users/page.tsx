'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X, Key, UserPlus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  username: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  last_login: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create user form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit password modal state
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null)
  const [newPasswordForEdit, setNewPasswordForEdit] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          isAdmin: newIsAdmin
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      // Reset form and refresh
      setNewUsername('')
      setNewPassword('')
      setNewIsAdmin(false)
      setShowCreateForm(false)
      fetchUsers()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  // Toggle admin status
  const toggleAdmin = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !user.is_admin })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to update user')
        return
      }

      fetchUsers()
    } catch (err) {
      alert('An error occurred')
    }
  }

  // Toggle active status
  const toggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.is_active })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to update user')
        return
      }

      fetchUsers()
    } catch (err) {
      alert('An error occurred')
    }
  }

  // Update password
  const handleUpdatePassword = async () => {
    if (!editingPasswordId || !newPasswordForEdit) return

    setUpdatingPassword(true)

    try {
      const res = await fetch(`/api/admin/users/${editingPasswordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPasswordForEdit })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to update password')
        return
      }

      setEditingPasswordId(null)
      setNewPasswordForEdit('')
      alert('Password updated successfully')
    } catch (err) {
      alert('An error occurred')
    } finally {
      setUpdatingPassword(false)
    }
  }

  // Delete user
  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate user "${user.username}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to delete user')
        return
      }

      fetchUsers()
    } catch (err) {
      alert('An error occurred')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage users and their access permissions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Create New User</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter username"
                />
                <p className="text-xs text-muted-foreground mt-1">3-30 chars, letters, numbers, underscores only</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter password"
                />
                <p className="text-xs text-muted-foreground mt-1">Min 8 chars with at least one number</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={newIsAdmin}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="isAdmin" className="text-sm">Grant admin privileges</label>
            </div>
            {createError && (
              <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
                {createError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create User
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewUsername('')
                  setNewPassword('')
                  setNewIsAdmin(false)
                  setCreateError(null)
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Edit Modal */}
      {editingPasswordId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input
                  type="password"
                  value={newPasswordForEdit}
                  onChange={(e) => setNewPasswordForEdit(e.target.value)}
                  minLength={8}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter new password"
                />
                <p className="text-xs text-muted-foreground mt-1">Min 8 chars with at least one number</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdatePassword}
                  disabled={updatingPassword || newPasswordForEdit.length < 8}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {updatingPassword ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  Update Password
                </button>
                <button
                  onClick={() => {
                    setEditingPasswordId(null)
                    setNewPasswordForEdit('')
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading users...</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4">Username</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Login</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4 font-medium">{user.username}</td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleAdmin(user)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-full font-medium',
                        user.is_admin
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {user.is_admin ? 'Admin' : 'User'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(user)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium',
                        user.is_active
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      )}
                    >
                      {user.is_active ? (
                        <>
                          <Check className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" /> Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Never'}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingPasswordId(user.id)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        title="Deactivate User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
