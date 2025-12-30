'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, RefreshCw, Check, X, Play, Edit2, Save, Globe, Loader2, RotateCcw, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdates } from '@/components/updates/update-provider'

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

// Season Setup Steps
const SETUP_STEPS = [
  { key: 'teams', name: 'Teams & Venues', description: 'Foundation data for all teams' },
  { key: 'fixtures', name: 'Season Fixtures', description: 'Full fixture list' },
  { key: 'standings', name: 'League Table', description: 'Current standings' },
  { key: 'team-stats', name: 'Team Statistics', description: 'Season stats' },
  { key: 'coaches', name: 'Managers', description: 'Coach information' },
  { key: 'player-squads', name: 'Squad Rosters', description: 'Player assignments' },
]

interface SetupStep {
  key: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  duration?: string
  counts?: string
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
  const { addRefreshEvent } = useUpdates()

  // Setup modal state
  const [setupLeague, setSetupLeague] = useState<League | null>(null)
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([])
  const [setupLogs, setSetupLogs] = useState<string[]>([])
  const [setupRunning, setSetupRunning] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [showDetailedLogs, setShowDetailedLogs] = useState(false)
  const [retryingStep, setRetryingStep] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

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

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current && showDetailedLogs) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [setupLogs, showDetailedLogs])

  // Fetch leagues
  const fetchLeagues = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/leagues', { credentials: 'include' })
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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: league.id, isActive: !league.is_active }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to update league')
        addRefreshEvent({
          category: 'leagues',
          type: 'refresh',
          status: 'error',
          message: `Failed to ${league.is_active ? 'deactivate' : 'activate'} ${league.name}`,
          details: {
            league: league.name,
            rawResponse: data
          }
        })
        return
      }

      addRefreshEvent({
        category: 'leagues',
        type: 'refresh',
        status: 'success',
        message: `${league.is_active ? 'Deactivated' : 'Activated'} ${league.name}`,
        details: {
          league: league.name,
          rawResponse: { id: league.id, name: league.name, isActive: !league.is_active }
        }
      })
      fetchLeagues()
    } catch (err) {
      alert('An error occurred')
    }
  }

  // Activate league
  const activateLeague = async (leagueId: string) => {
    try {
      const res = await fetch('/api/admin/leagues', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leagueId, isActive: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to activate league')
      }

      setSetupLogs(prev => [...prev, '✓ League activated successfully!'])
      fetchLeagues()
      return true
    } catch (err) {
      setSetupLogs(prev => [...prev, `✗ Failed to activate: ${err instanceof Error ? err.message : 'Unknown error'}`])
      return false
    }
  }

  // Create new league
  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/admin/leagues', {
        method: 'POST',
        credentials: 'include',
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
        addRefreshEvent({
          category: 'leagues',
          type: 'refresh',
          status: 'error',
          message: `Failed to create league: ${newLeague.name}`,
          details: {
            league: newLeague.name,
            rawResponse: data
          }
        })
        throw new Error(data.error || 'Failed to create league')
      }

      addRefreshEvent({
        category: 'leagues',
        type: 'refresh',
        status: 'success',
        message: `Created league: ${data.league.name}`,
        details: {
          inserted: 1,
          league: data.league.name,
          rawResponse: data.league
        }
      })

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
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: league.id,
          ...editData,
          currentSeason: editData.current_season ? parseInt(editData.current_season.toString()) : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        addRefreshEvent({
          category: 'leagues',
          type: 'refresh',
          status: 'error',
          message: `Failed to update league: ${league.name}`,
          details: {
            league: league.name,
            rawResponse: data
          }
        })
        alert(data.error || 'Failed to update league')
        return
      }

      addRefreshEvent({
        category: 'leagues',
        type: 'refresh',
        status: 'success',
        message: `Updated league: ${data.league?.name || league.name}`,
        details: {
          updated: 1,
          league: data.league?.name || league.name,
          rawResponse: { id: league.id, changes: editData, result: data.league }
        }
      })

      setEditingId(null)
      setEditData({})
      fetchLeagues()
    } catch (err) {
      alert('An error occurred')
    }
  }

  // Parse step info from message
  const parseStepFromMessage = (message: string): { stepIndex: number; isStart: boolean; isComplete: boolean; counts?: string; duration?: string } | null => {
    // Match step start: "[1/6] Teams & Venues: ..."
    const startMatch = message.match(/^\[(\d+)\/6\]\s+(.+?):\s*(.*)$/)
    if (startMatch) {
      return { stepIndex: parseInt(startMatch[1]) - 1, isStart: true, isComplete: false }
    }

    // Match completion with counts: "Teams: 20 inserted, 0 updated (2.3s)"
    const completeMatch = message.match(/^(Teams|Fixtures|Standings|Team Stats|Coaches|Player Squads):\s*(.+?)\s*\((\d+\.?\d*)s\)$/i)
    if (completeMatch) {
      const stepName = completeMatch[1].toLowerCase()
      const stepMap: Record<string, number> = {
        'teams': 0, 'fixtures': 1, 'standings': 2, 'team stats': 3, 'coaches': 4, 'player squads': 5
      }
      const idx = stepMap[stepName]
      if (idx !== undefined) {
        return { stepIndex: idx, isStart: false, isComplete: true, counts: completeMatch[2], duration: `${completeMatch[3]}s` }
      }
    }

    return null
  }

  // Run season setup for a league
  const runSeasonSetup = async (league: League) => {
    if (!confirm(`Run Season Setup for ${league.name}? This will fetch all foundational data.`)) {
      return
    }

    // Initialize modal state
    setSetupLeague(league)
    setSetupSteps(SETUP_STEPS.map(s => ({ key: s.key, name: s.name, status: 'pending' as const })))
    setSetupLogs([`Starting season setup for ${league.name}...`])
    setSetupRunning(true)
    setSetupComplete(false)
    setShowDetailedLogs(false)

    try {
      const res = await fetch(`/api/data/refresh/season-setup?league_id=${league.id}`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.body) {
        throw new Error('No response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let currentStepIndex = -1

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.message) {
              setSetupLogs(prev => [...prev, data.message])

              // Parse step progress
              const stepInfo = parseStepFromMessage(data.message)
              if (stepInfo) {
                if (stepInfo.isStart) {
                  currentStepIndex = stepInfo.stepIndex
                  setSetupSteps(prev => prev.map((s, i) =>
                    i === stepInfo.stepIndex ? { ...s, status: 'running' } : s
                  ))
                } else if (stepInfo.isComplete) {
                  setSetupSteps(prev => prev.map((s, i) =>
                    i === stepInfo.stepIndex ? {
                      ...s,
                      status: 'success',
                      counts: stepInfo.counts,
                      duration: stepInfo.duration
                    } : s
                  ))
                }
              }

              // Check for errors in message
              if (data.type === 'error' || data.message.toLowerCase().includes('error') || data.message.toLowerCase().includes('failed')) {
                if (currentStepIndex >= 0) {
                  setSetupSteps(prev => prev.map((s, i) =>
                    i === currentStepIndex && s.status === 'running' ? {
                      ...s,
                      status: 'error',
                      message: data.message
                    } : s
                  ))
                }
              }
            }

            // Final summary
            if (data.done) {
              setSetupRunning(false)
              setSetupComplete(true)

              // Check if all steps succeeded
              const allSucceeded = data.failed === 0

              if (allSucceeded) {
                setSetupLogs(prev => [...prev, `✓ All ${data.successful}/${data.endpoints} steps completed successfully!`])
                // Auto-activate the league
                setSetupLogs(prev => [...prev, 'Activating league...'])
                await activateLeague(league.id)
              } else {
                setSetupLogs(prev => [...prev, `⚠ ${data.successful}/${data.endpoints} steps completed. ${data.failed} failed.`])
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      setSetupLogs(prev => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`])
      setSetupRunning(false)
      setSetupComplete(true)
    }
  }

  // Retry a single failed step
  const retryStep = async (stepKey: string) => {
    if (!setupLeague) return

    setRetryingStep(stepKey)
    setSetupSteps(prev => prev.map(s =>
      s.key === stepKey ? { ...s, status: 'running', message: undefined } : s
    ))
    setSetupLogs(prev => [...prev, `Retrying ${SETUP_STEPS.find(s => s.key === stepKey)?.name}...`])

    try {
      const res = await fetch(`/api/data/refresh/${stepKey}?league_id=${setupLeague.id}`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.body) {
        throw new Error('No response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let lastMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.message) {
              lastMessage = data.message
              setSetupLogs(prev => [...prev, data.message])
            }

            if (data.done || data.success !== undefined) {
              const success = data.success !== false && !lastMessage.toLowerCase().includes('error')
              setSetupSteps(prev => prev.map(s =>
                s.key === stepKey ? {
                  ...s,
                  status: success ? 'success' : 'error',
                  message: success ? undefined : lastMessage
                } : s
              ))

              if (success) {
                setSetupLogs(prev => [...prev, `✓ ${SETUP_STEPS.find(s => s.key === stepKey)?.name} completed!`])

                // Check if all steps are now successful
                const updatedSteps = setupSteps.map(s =>
                  s.key === stepKey ? { ...s, status: 'success' as const } : s
                )
                const allSuccess = updatedSteps.every(s => s.status === 'success')
                if (allSuccess && !setupLeague.is_active) {
                  setSetupLogs(prev => [...prev, 'All steps completed! Activating league...'])
                  await activateLeague(setupLeague.id)
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      setSetupSteps(prev => prev.map(s =>
        s.key === stepKey ? {
          ...s,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error'
        } : s
      ))
      setSetupLogs(prev => [...prev, `✗ Retry failed: ${err instanceof Error ? err.message : 'Unknown error'}`])
    } finally {
      setRetryingStep(null)
    }
  }

  // Close setup modal
  const closeSetupModal = () => {
    setSetupLeague(null)
    setSetupSteps([])
    setSetupLogs([])
    setSetupRunning(false)
    setSetupComplete(false)
    setShowDetailedLogs(false)
    fetchLeagues()
  }

  // Get leagues not yet added
  const availablePresets = POPULAR_LEAGUES.filter(
    preset => !leagues.some(l => l.api_id === preset.apiId)
  )

  // Calculate setup progress
  const completedSteps = setupSteps.filter(s => s.status === 'success').length
  const failedSteps = setupSteps.filter(s => s.status === 'error').length
  const progressPercent = (completedSteps / SETUP_STEPS.length) * 100

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

      {/* Season Setup Modal */}
      {setupLeague && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                {setupLeague.logo && (
                  <Image
                    src={setupLeague.logo}
                    alt={setupLeague.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-lg">Season Setup: {setupLeague.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {setupRunning ? 'Importing data...' : setupComplete ?
                      (failedSteps === 0 ? 'Setup complete!' : `${failedSteps} step(s) failed`) :
                      'Preparing...'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>{completedSteps}/{SETUP_STEPS.length} steps completed</span>
                  {failedSteps > 0 && <span className="text-red-500">{failedSteps} failed</span>}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      failedSteps > 0 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Steps List */}
            <div className="p-4 border-b border-border">
              <div className="space-y-2">
                {setupSteps.map((step, idx) => (
                  <div
                    key={step.key}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      step.status === 'success' && "bg-green-500/10 border-green-500/30",
                      step.status === 'error' && "bg-red-500/10 border-red-500/30",
                      step.status === 'running' && "bg-blue-500/10 border-blue-500/30",
                      step.status === 'pending' && "bg-muted/30 border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Status Icon */}
                      {step.status === 'pending' && (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                      {step.status === 'running' && (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {step.status === 'success' && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {step.status === 'error' && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}

                      <div>
                        <div className="font-medium">
                          {idx + 1}. {step.name}
                        </div>
                        {step.status === 'success' && step.counts && (
                          <div className="text-xs text-green-600">
                            {step.counts} {step.duration && `(${step.duration})`}
                          </div>
                        )}
                        {step.status === 'error' && step.message && (
                          <div className="text-xs text-red-500 truncate max-w-md">
                            {step.message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Retry Button */}
                    {step.status === 'error' && setupComplete && (
                      <button
                        onClick={() => retryStep(step.key)}
                        disabled={retryingStep !== null}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {retryingStep === step.key ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                        Retry
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Logs Toggle */}
            <div className="border-b border-border">
              <button
                onClick={() => setShowDetailedLogs(!showDetailedLogs)}
                className="w-full p-3 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="text-muted-foreground">
                  {showDetailedLogs ? 'Hide' : 'Show'} detailed logs ({setupLogs.length} entries)
                </span>
                {showDetailedLogs ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Detailed Logs */}
            {showDetailedLogs && (
              <div className="flex-1 overflow-y-auto max-h-[200px] p-4 bg-muted/30 font-mono text-xs">
                {setupLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "py-0.5",
                      log.includes('Error') || log.includes('✗') || log.includes('failed') ? "text-red-500" :
                      log.includes('✓') || log.includes('complete') || log.includes('success') ? "text-green-500" :
                      log.includes('⚠') ? "text-yellow-500" :
                      "text-muted-foreground"
                    )}
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div>
                {setupComplete && failedSteps > 0 && !setupLeague.is_active && (
                  <button
                    onClick={() => activateLeague(setupLeague.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-600 rounded-lg hover:bg-yellow-500/30 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Activate Anyway
                  </button>
                )}
              </div>
              <button
                onClick={closeSetupModal}
                disabled={setupRunning}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors",
                  setupRunning
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {setupRunning ? 'Please wait...' : 'Close'}
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
                            disabled={!!setupLeague}
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
          <li>League will be <strong>auto-activated</strong> when all 6 steps complete successfully</li>
          <li>If any step fails, you can retry individually or activate manually</li>
        </ol>
      </div>
    </div>
  )
}
