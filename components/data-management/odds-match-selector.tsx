'use client'

import { useState, useEffect } from 'react'
import { X, Check, Loader2, RefreshCw, Calendar, Square, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Fixture {
  id: string
  api_id: number
  match_date: string
  round: string | null
  home_team: { name: string; logo: string | null } | null
  away_team: { name: string; logo: string | null } | null
}

interface OddsMatchSelectorProps {
  isOpen: boolean
  onClose: () => void
  onRefresh: (fixtureIds: string[]) => void
  isRefreshing: boolean
  leagueId?: string
}

export function OddsMatchSelector({ isOpen, onClose, onRefresh, isRefreshing, leagueId }: OddsMatchSelectorProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      fetchFixtures()
    }
  }, [isOpen, leagueId])

  const fetchFixtures = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = leagueId ? `?league_id=${leagueId}` : ''
      const res = await fetch(`/api/data/fixtures/upcoming${params}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setFixtures(data.fixtures || [])
        // Pre-select all fixtures
        setSelectedIds(new Set((data.fixtures || []).map((f: Fixture) => f.id)))
      }
    } catch (err) {
      setError('Failed to fetch fixtures')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(fixtures.map(f => f.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleRefresh = () => {
    if (selectedIds.size > 0) {
      onRefresh(Array.from(selectedIds))
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Select Matches for Odds Refresh
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selection controls */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <button
            onClick={selectAll}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          >
            <CheckSquare className="w-3 h-3" />
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
          >
            <Square className="w-3 h-3" />
            Deselect All
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            {selectedIds.size} of {fixtures.length} selected
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : fixtures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming fixtures found
            </div>
          ) : (
            <div className="space-y-2">
              {fixtures.map(fixture => {
                const isSelected = selectedIds.has(fixture.id)
                return (
                  <button
                    key={fixture.id}
                    onClick={() => toggleSelect(fixture.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(
                      "w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>

                    {/* Match info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {fixture.home_team?.logo && (
                          <img
                            src={fixture.home_team.logo}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                        )}
                        <span className="truncate">{fixture.home_team?.name || 'TBD'}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="truncate">{fixture.away_team?.name || 'TBD'}</span>
                        {fixture.away_team?.logo && (
                          <img
                            src={fixture.away_team.logo}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatDate(fixture.match_date)}</span>
                        {fixture.round && (
                          <>
                            <span>·</span>
                            <span>{fixture.round}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRefresh}
            disabled={selectedIds.size === 0 || isRefreshing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              selectedIds.size > 0 && !isRefreshing
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh {selectedIds.size} Match{selectedIds.size !== 1 ? 'es' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
