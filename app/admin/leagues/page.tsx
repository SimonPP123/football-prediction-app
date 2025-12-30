'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, RefreshCw, Check, X, Play, Pause, Edit2, Save, Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface League {
  id: string
  api_id: number
  name: string
  country: string
  logo: string
  current_season: number
  odds_sport_key: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

// Popular leagues for quick add
const POPULAR_LEAGUES = [
  { apiId: 39, name: 'Premier League', country: 'England', oddsSportKey: 'soccer_epl' },
  { apiId: 140, name: 'La Liga', country: 'Spain', oddsSportKey: 'soccer_spain_la_liga' },
  { apiId: 78, name: 'Bundesliga', country: 'Germany', oddsSportKey: 'soccer_germany_bundesliga' },
  { apiId: 135, name: 'Serie A', country: 'Italy', oddsSportKey: 'soccer_italy_serie_a' },
  { apiId: 61, name: 'Ligue 1', country: 'France', oddsSportKey: 'soccer_france_ligue_one' },
  { apiId: 40, name: 'Championship', country: 'England', oddsSportKey: 'soccer_england_championship' },
  { apiId: 88, name: 'Eredivisie', country: 'Netherlands', oddsSportKey: 'soccer_netherlands_eredivisie' },
  { apiId: 94, name: 'Primeira Liga', country: 'Portugal', oddsSportKey: 'soccer_portugal_primeira_liga' },
]

export default function AdminLeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<League>>({})
  const [runningSetup, setRunningSetup] = useState<string | null>(null)
  const [setupLogs, setSetupLogs] = useState<string[]>([])

  // New league form state
  const [newLeague, setNewLeague] = useState({
    apiId: '',
    name: '',
    country: '',
    currentSeason: new Date().getFullYear().toString(),
    oddsSportKey: '',
    isActive: false,
  })
  const [creating, setCreating] = useState(false)

  // Fetch leagues
  const fetchLeagues = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/leagues')
      if (!res.ok) throw new Error('Failed to fetch leagues')
      const data = await res.json()
      setLeagues(data.leagues || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeagues()
  }, [])

  // Toggle league active status
  const toggleActive = async (league: League) => {
    try {
      const res = await fetch('/api/admin/leagues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: league.id, isActive: !league.is_active }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to update league')
        return
      }

      fetchLeagues()
    } catch (err) {
      alert('An error occurred')
    }
  }

  // Create new league
  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/admin/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiId: parseInt(newLeague.apiId),
          name: newLeague.name,
          country: newLeague.country,
          currentSeason: parseInt(newLeague.currentSeason),
          oddsSportKey: newLeague.oddsSportKey || null,
          isActive: newLeague.isActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create league')
      }

      // Reset form
      setNewLeague({
        apiId: '',
        name: '',
        country: '',
        currentSeason: new Date().getFullYear().toString(),
        oddsSportKey: '',
        isActive: false,
      })
      setShowAddForm(false)
      fetchLeagues()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  // Quick add popular league
  const quickAddLeague = (preset: typeof POPULAR_LEAGUES[0]) => {
    setNewLeague({
      apiId: preset.apiId.toString(),
      name: preset.name,
      country: preset.country,
      currentSeason: new Date().getFullYear().toString(),
      oddsSportKey: preset.oddsSportKey,
      isActive: false,
    })
    setShowAddForm(true)
  }

  // Save edited league
  const saveEdit = async (league: League) => {
    try {
      const res = await fetch('/api/admin/leagues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: league.id,
          ...editData,
          currentSeason: editData.current_season ? parseInt(editData.current_season.toString()) : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to update league')
        return
      }

      setEditingId(null)
      setEditData({})
      fetchLeagues()
    } catch (err) {
      alert('An error occurred')
    }
  }

  // Run season setup for a league
  const runSeasonSetup = async (league: League) => {
    if (!confirm(`Run Season Setup for ${league.name}? This will fetch all foundational data.`)) {
      return
    }

    setRunningSetup(league.id)
    setSetupLogs([`Starting season setup for ${league.name}...`])

    try {
      const res = await fetch(`/api/data/refresh/season-setup?league_id=${league.id}`, {
        method: 'POST',
      })

      if (!res.body) {
        throw new Error('No response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'log' && data.message) {
              setSetupLogs(prev => [...prev, data.message])
            } else if (data.type === 'complete') {
              setSetupLogs(prev => [...prev, `Setup complete!`])
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      setSetupLogs(prev => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`])
    } finally {
      setRunningSetup(null)
    }
  }

  // Get leagues not yet added
  const availablePresets = POPULAR_LEAGUES.filter(
    preset => !leagues.some(l => l.api_id === preset.apiId)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">League Management</h2>
          <p className="text-muted-foreground">Configure leagues for the prediction system</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLeagues}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add League
          </button>
        </div>
      </div>

      {/* Quick Add Section */}
      {availablePresets.length > 0 && (
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">Quick Add Popular Leagues</h3>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map(preset => (
              <button
                key={preset.apiId}
                onClick={() => quickAddLeague(preset)}
                className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <Image
                  src={`https://media.api-sports.io/football/leagues/${preset.apiId}.png`}
                  alt={preset.name}
                  width={20}
                  height={20}
                  className="rounded"
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add League Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Add New League</h3>
          <form onSubmit={handleCreateLeague} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">API-Football ID *</label>
                <input
                  type="number"
                  value={newLeague.apiId}
                  onChange={(e) => setNewLeague({ ...newLeague, apiId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 39"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={newLeague.name}
                  onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Premier League"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country *</label>
                <input
                  type="text"
                  value={newLeague.country}
                  onChange={(e) => setNewLeague({ ...newLeague, country: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., England"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Season</label>
                <input
                  type="number"
                  value={newLeague.currentSeason}
                  onChange={(e) => setNewLeague({ ...newLeague, currentSeason: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Odds API Sport Key</label>
                <input
                  type="text"
                  value={newLeague.oddsSportKey}
                  onChange={(e) => setNewLeague({ ...newLeague, oddsSportKey: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., soccer_epl"
                />
                <p className="text-xs text-muted-foreground mt-1">Required for odds data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={newLeague.isActive}
                onChange={(e) => setNewLeague({ ...newLeague, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="isActive" className="text-sm">Activate immediately (run Season Setup first)</label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add League
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewLeague({
                    apiId: '',
                    name: '',
                    country: '',
                    currentSeason: new Date().getFullYear().toString(),
                    oddsSportKey: '',
                    isActive: false,
                  })
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Setup Logs Modal */}
      {runningSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <h3 className="font-semibold">Running Season Setup</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-muted/30 font-mono text-sm">
              {setupLogs.map((log, idx) => (
                <div key={idx} className={cn(
                  "py-1",
                  log.includes('Error') && "text-red-500",
                  log.includes('complete') && "text-green-500",
                  log.includes('success') && "text-green-500"
                )}>
                  {log}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => {
                  setRunningSetup(null)
                  setSetupLogs([])
                  fetchLeagues()
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leagues Table */}
      {error ? (
        <div className="text-center text-red-500 py-8">{error}</div>
      ) : loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading leagues...</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4">League</th>
                <th className="p-4">API ID</th>
                <th className="p-4">Season</th>
                <th className="p-4">Odds Key</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((league) => (
                <tr key={league.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {league.logo && (
                        <Image
                          src={league.logo}
                          alt={league.name}
                          width={32}
                          height={32}
                          className="rounded"
                        />
                      )}
                      <div>
                        {editingId === league.id ? (
                          <input
                            type="text"
                            value={editData.name ?? league.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="px-2 py-1 border border-border rounded bg-background text-sm"
                          />
                        ) : (
                          <span className="font-medium">{league.name}</span>
                        )}
                        <p className="text-xs text-muted-foreground">{league.country}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{league.api_id}</td>
                  <td className="p-4 text-sm">
                    {editingId === league.id ? (
                      <input
                        type="number"
                        value={editData.current_season ?? league.current_season}
                        onChange={(e) => setEditData({ ...editData, current_season: parseInt(e.target.value) })}
                        className="w-20 px-2 py-1 border border-border rounded bg-background text-sm"
                      />
                    ) : (
                      `${league.current_season}-${league.current_season + 1}`
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    {editingId === league.id ? (
                      <input
                        type="text"
                        value={editData.odds_sport_key ?? league.odds_sport_key ?? ''}
                        onChange={(e) => setEditData({ ...editData, odds_sport_key: e.target.value || null })}
                        className="w-40 px-2 py-1 border border-border rounded bg-background text-sm"
                        placeholder="Not set"
                      />
                    ) : (
                      league.odds_sport_key || <span className="text-muted-foreground">Not set</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleActive(league)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium',
                        league.is_active
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {league.is_active ? (
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
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === league.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(league)}
                            className="p-2 hover:bg-green-500/10 text-green-500 rounded-lg transition-colors"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null)
                              setEditData({})
                            }}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(league.id)
                              setEditData({})
                            }}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => runSeasonSetup(league)}
                            disabled={!!runningSetup}
                            className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors disabled:opacity-50"
                            title="Run Season Setup"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leagues.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No leagues configured</p>
              <p className="text-sm">Click &quot;Add League&quot; to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 text-sm text-muted-foreground">
        <h4 className="font-medium text-foreground mb-2">Setup Guide</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Add a new league using API-Football league ID</li>
          <li>Run &quot;Season Setup&quot; to import teams, fixtures, and standings</li>
          <li>Configure the Odds API sport key for betting odds</li>
          <li>Activate the league to make it available in the selector</li>
        </ol>
      </div>
    </div>
  )
}
