'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, LogOut, User } from 'lucide-react'
import { useLeague, getLeagueTitle } from '@/contexts/league-context'

interface HeaderProps {
  title: string
  subtitle?: string
  showLeagueSubtitle?: boolean // If true and no subtitle provided, shows current league
}

interface AuthData {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
}

export function Header({ title, subtitle, showLeagueSubtitle = true }: HeaderProps) {
  const router = useRouter()
  const [authData, setAuthData] = useState<AuthData | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const { currentLeague } = useLeague()

  // Determine the subtitle to display
  const displaySubtitle = subtitle || (showLeagueSubtitle ? getLeagueTitle(currentLeague) : undefined)

  useEffect(() => {
    // Read auth data from cookie (client-side)
    // Since the cookie is httpOnly, we need to rely on the response from login
    // or make an API call to get current user info
    // For simplicity, we'll parse the cookie if available (non-httpOnly part)
    // Actually, httpOnly cookies can't be read client-side, so we'll need to
    // either store user info separately or make an API call

    // For now, let's create a simple current user endpoint
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setAuthData(data.user)
        }
      } catch {
        // Ignore errors
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      setLoggingOut(false)
    }
  }

  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {displaySubtitle && (
            <p className="text-sm text-muted-foreground">{displaySubtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Link - Only for admins */}
          {authData?.isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/10 text-primary transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* User info */}
          {authData && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{authData.username}</span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-500/10 text-red-500 transition-colors disabled:opacity-50"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
