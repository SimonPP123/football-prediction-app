'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { LeagueSelector } from '@/components/layout/league-selector'
import { DataRefreshModal } from '@/components/data/data-refresh-modal'

interface AuthData {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
}

// Button to trigger the data refresh modal - used in mobile header (admin only)
export function MobileDataRefreshButton() {
  const [showModal, setShowModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setIsAdmin(data.user?.isAdmin === true)
        }
      } catch {
        // Ignore errors
      }
    }
    checkAuth()
  }, [])

  // Don't render anything for non-admins
  if (!isAdmin) return null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center justify-center p-3 hover:bg-muted rounded-lg transition-colors min-w-[44px] min-h-[44px]"
        title="Data Refresh"
      >
        <RefreshCw className="w-5 h-5" />
      </button>
      <DataRefreshModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}

export function GlobalStatusBar() {
  const [showModal, setShowModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setIsAdmin(data.user?.isAdmin === true)
        }
      } catch {
        // Ignore errors
      }
    }
    checkAuth()
  }, [])

  return (
    <>
      <div className="bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: League selector */}
          <LeagueSelector />

          {/* Right: Data Refresh button (admin only) */}
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Data Refresh</span>
            </button>
          )}
        </div>
      </div>
      {isAdmin && <DataRefreshModal isOpen={showModal} onClose={() => setShowModal(false)} />}
    </>
  )
}
