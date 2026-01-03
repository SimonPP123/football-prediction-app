'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { PredictionTable } from '@/components/predictions/prediction-table'
import { RecentResultCard } from '@/components/predictions/recent-result-card'
import { RecentResultsTable } from '@/components/predictions/recent-results-table'
import { AccuracyStatsPanel } from '@/components/predictions/accuracy-stats-panel'
import { ModelComparison } from '@/components/predictions/model-comparison'
import { CalibrationChart } from '@/components/predictions/calibration-chart'
import { SettingsModal } from '@/components/predictions/settings-modal'
import { LayoutGrid, List, Loader2, Settings, X, Copy, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter, ExternalLink, Save, BarChart3, FileJson, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AI_MODELS } from '@/types'
import { useLeague } from '@/contexts/league-context'
import { DEFAULT_PREDICTION_PROMPT, PROMPT_VARIABLES } from '@/lib/constants/default-prompt'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'

// Default webhook URLs
const DEFAULT_WEBHOOK = 'https://nn.analyserinsights.com/webhook/football-prediction'
const DEFAULT_ANALYSIS_WEBHOOK = 'https://nn.analyserinsights.com/webhook/post-match-analysis'

// Pagination
const ITEMS_PER_PAGE = 12

// Parse round number from "Regular Season - X" format
const parseRoundNumber = (round: string | null): number | null => {
  if (!round) return null
  const match = round.match(/Regular Season - (\d+)/)
  return match ? parseInt(match[1], 10) : null
}

export default function PredictionsPage() {
  const { currentLeague } = useLeague()
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingIds, setGeneratingIds] = useState<string[]>([])
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK)
  const [selectedModel, setSelectedModel] = useState('openai/gpt-5-mini')
  const [selectedRounds, setSelectedRounds] = useState<number[]>([])
  const [showRoundFilter, setShowRoundFilter] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [errorIds, setErrorIds] = useState<Record<string, string>>({}) // fixtureId -> error message
  const [recentResults, setRecentResults] = useState<any[]>([])
  const [liveFixtures, setLiveFixtures] = useState<any[]>([])
  const liveFixtureIdsRef = useRef<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'upcoming' | 'results'>('upcoming')
  const [showStats, setShowStats] = useState(false)
  const [upcomingPage, setUpcomingPage] = useState(0)
  const [resultsPage, setResultsPage] = useState(0)
  const [showLive, setShowLive] = useState(true)
  // Settings state
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [analysisWebhookUrl, setAnalysisWebhookUrl] = useState(DEFAULT_ANALYSIS_WEBHOOK)
  const settingsDropdownRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  // Webhook documentation modal state
  const [showWebhookDocs, setShowWebhookDocs] = useState(false)
  const [webhookDocsTab, setWebhookDocsTab] = useState<'prediction' | 'analysis' | 'pre-match' | 'live' | 'post-match'>('prediction')
  const [webhookDocsCopied, setWebhookDocsCopied] = useState(false)
  // Prompt editor modal state
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [tempPrompt, setTempPrompt] = useState('')
  // Webhook secret state (just for display - actual value is in database)
  const [webhookSecretSet, setWebhookSecretSet] = useState(false)

  // Load webhook secret status from API
  const loadWebhookSecretStatus = async () => {
    try {
      const res = await fetch('/api/automation/webhooks', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setWebhookSecretSet(data.webhook_secret_set || false)
      }
    } catch {
      // Ignore errors - just won't show secret status
    }
  }

  // Load saved settings on mount
  useEffect(() => {
    // Load model from localStorage (still client-side preference)
    const savedModel = localStorage.getItem('prediction_model')
    if (savedModel) {
      setSelectedModel(savedModel)
    }
    // Load custom prompt from database
    loadCustomPrompt()
    // Load webhook secret status from API
    loadWebhookSecretStatus()
  }, [])

  const loadCustomPrompt = async () => {
    try {
      // First check if there's a localStorage prompt to migrate
      const localPrompt = localStorage.getItem('prediction_custom_prompt')
      if (localPrompt) {
        // Skip old-format prompts
        if (!localPrompt.includes('You are an elite football analyst') &&
            !localPrompt.includes('OUTPUT FORMAT (JSON)')) {
          // Migrate to database
          await fetch('/api/automation/prompt', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ custom_prompt: localPrompt })
          })
          setCustomPrompt(localPrompt)
        }
        // Clear localStorage after migration
        localStorage.removeItem('prediction_custom_prompt')
        console.log('Migrated custom prompt from localStorage to database')
        return
      }

      // Load from database
      const res = await fetch('/api/automation/prompt', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.custom_prompt) {
          setCustomPrompt(data.custom_prompt)
        }
      }
    } catch (err) {
      console.error('Failed to load custom prompt:', err)
    }
  }

  useEffect(() => {
    // Cancel any pending request when league changes or component unmounts
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // Pass league ID explicitly to avoid stale closure issues
    fetchFixtures(currentLeague?.id, abortControllerRef.current.signal)

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [currentLeague?.id])

  // Auto-refresh live fixtures every 60 seconds
  // Also check if any matches finished and need to move to results
  useEffect(() => {
    const refreshLive = async () => {
      try {
        const params = currentLeague?.id ? `?league_id=${currentLeague.id}` : ''
        const res = await fetch(`/api/fixtures/live${params}`, { credentials: 'include' })
        if (res.ok) {
          const newLiveData = await res.json()
          const newLiveFixtures = Array.isArray(newLiveData) ? newLiveData : []

          // Check if any previously live matches are no longer live (finished)
          const currentLiveIds = new Set(newLiveFixtures.map((m: any) => m.id))
          const hasFinishedMatches = Array.from(liveFixtureIdsRef.current).some(id => !currentLiveIds.has(id))

          // Update ref with current live fixture IDs
          liveFixtureIdsRef.current = currentLiveIds
          setLiveFixtures(newLiveFixtures)

          // If matches finished, fetch updated results
          // (The live endpoint already syncs finished match statuses to DB)
          if (hasFinishedMatches) {
            const resultsParams = currentLeague?.id ? `?league_id=${currentLeague.id}` : ''
            const resultsRes = await fetch(`/api/fixtures/recent-results${resultsParams}`, { credentials: 'include' })
            if (resultsRes.ok) {
              const resultsData = await resultsRes.json()
              setRecentResults(Array.isArray(resultsData) ? resultsData : [])
            }
          }
        }
      } catch (error) {
        console.error('Failed to refresh live fixtures:', error)
      }
    }

    const intervalId = setInterval(refreshLive, 60000) // Refresh every 60 seconds

    return () => clearInterval(intervalId)
  }, [currentLeague?.id])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setShowRoundFilter(false)
        setShowModelDropdown(false)
        setShowSettingsDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Get available rounds from both upcoming fixtures and recent results
  const availableRounds = useMemo(() => {
    const rounds = new Set<number>()
    fixtures.forEach(f => {
      const roundNum = parseRoundNumber(f.round)
      if (roundNum) rounds.add(roundNum)
    })
    recentResults.forEach(f => {
      const roundNum = parseRoundNumber(f.round)
      if (roundNum) rounds.add(roundNum)
    })
    return Array.from(rounds).sort((a, b) => a - b)
  }, [fixtures, recentResults])

  // Filter fixtures by selected rounds
  const filteredFixtures = useMemo(() => {
    if (selectedRounds.length === 0) return fixtures
    return fixtures.filter(f => {
      const roundNum = parseRoundNumber(f.round)
      return roundNum && selectedRounds.includes(roundNum)
    })
  }, [fixtures, selectedRounds])

  // Filter recent results by selected rounds
  const filteredRecentResults = useMemo(() => {
    if (selectedRounds.length === 0) return recentResults
    return recentResults.filter(f => {
      const roundNum = parseRoundNumber(f.round)
      return roundNum && selectedRounds.includes(roundNum)
    })
  }, [recentResults, selectedRounds])

  // Reset to first page when filters change
  useEffect(() => {
    setUpcomingPage(0)
    setResultsPage(0)
  }, [selectedRounds, currentLeague?.id])

  // Pagination calculations
  const upcomingTotalPages = Math.ceil(filteredFixtures.length / ITEMS_PER_PAGE)
  const resultsTotalPages = Math.ceil(filteredRecentResults.length / ITEMS_PER_PAGE)

  const paginatedFixtures = useMemo(() => {
    const start = upcomingPage * ITEMS_PER_PAGE
    return filteredFixtures.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredFixtures, upcomingPage])

  const paginatedResults = useMemo(() => {
    const start = resultsPage * ITEMS_PER_PAGE
    return filteredRecentResults.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRecentResults, resultsPage])

  // Toggle round selection
  const toggleRound = (round: number) => {
    setSelectedRounds(prev =>
      prev.includes(round)
        ? prev.filter(r => r !== round)
        : [...prev, round]
    )
  }

  // Select all rounds
  const selectAllRounds = () => {
    setSelectedRounds([])
  }

  // Save model selection
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('prediction_model', modelId)
    setShowModelDropdown(false)
  }

  const fetchFixtures = async (leagueId: string | undefined, signal?: AbortSignal) => {
    try {
      setLoading(true)
      const params = leagueId ? `league_id=${leagueId}` : ''
      // Fetch upcoming, live, and all historical results in parallel
      const [upcomingRes, recentRes, liveRes] = await Promise.all([
        fetch(`/api/fixtures/upcoming${params ? '?' + params : ''}`, { signal, credentials: 'include' }),
        fetch(`/api/fixtures/recent-results?rounds=all${params ? '&' + params : ''}`, { signal, credentials: 'include' }),
        fetch(`/api/fixtures/live${params ? '?' + params : ''}`, { signal, credentials: 'include' })
      ])

      // Check if request was aborted
      if (signal?.aborted) return

      const upcomingData = await upcomingRes.json()
      const recentData = await recentRes.json()
      const liveData = await liveRes.json()

      // Check again after parsing (in case it was aborted during parsing)
      if (signal?.aborted) return

      setFixtures(Array.isArray(upcomingData) ? upcomingData : [])
      setRecentResults(Array.isArray(recentData) ? recentData : [])
      const liveArray = Array.isArray(liveData) ? liveData : []
      setLiveFixtures(liveArray)
      liveFixtureIdsRef.current = new Set(liveArray.map((m: any) => m.id))
    } catch (error: any) {
      // Don't log abort errors - they're expected when changing leagues
      if (error?.name !== 'AbortError') {
        console.error('Failed to fetch fixtures:', error)
      }
    } finally {
      // Only set loading to false if not aborted
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  const handleGeneratePrediction = async (fixtureId: string, regenerate: boolean = false): Promise<boolean> => {
    setGeneratingIds(prev => [...prev, fixtureId])
    // Clear any previous error for this fixture
    setErrorIds(prev => {
      const { [fixtureId]: _, ...rest } = prev
      return rest
    })

    try {
      const res = await fetch('/api/predictions/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixture_id: fixtureId,
          model: selectedModel,
          custom_prompt: customPrompt || DEFAULT_PREDICTION_PROMPT,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Refresh fixtures to get new prediction
        await fetchFixtures(currentLeague?.id)
        return true
      } else {
        // Handle error response
        const errorMsg = data.error === 'timeout'
          ? 'Timed out after 5 minutes'
          : data.message || data.error || 'Generation failed'
        setErrorIds(prev => ({ ...prev, [fixtureId]: errorMsg }))
        return false
      }
    } catch (error) {
      console.error('Failed to generate prediction:', error)
      const errorMsg = error instanceof Error ? error.message : 'Network error'
      setErrorIds(prev => ({ ...prev, [fixtureId]: errorMsg }))
      return false
    } finally {
      setGeneratingIds(prev => prev.filter(id => id !== fixtureId))
    }
  }

  // Clear error for a fixture (used by retry button)
  const clearError = (fixtureId: string) => {
    setErrorIds(prev => {
      const { [fixtureId]: _, ...rest } = prev
      return rest
    })
  }


  // Prompt editor handlers
  const [savingPrompt, setSavingPrompt] = useState(false)

  const openPromptEditor = () => {
    setTempPrompt(customPrompt || DEFAULT_PREDICTION_PROMPT)
    setShowPromptEditor(true)
    setShowSettingsDropdown(false)
  }

  const savePrompt = async () => {
    setSavingPrompt(true)
    try {
      const res = await fetch('/api/automation/prompt', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ custom_prompt: tempPrompt })
      })
      if (res.ok) {
        setCustomPrompt(tempPrompt)
        setShowPromptEditor(false)
      } else {
        console.error('Failed to save prompt')
      }
    } catch (err) {
      console.error('Error saving prompt:', err)
    } finally {
      setSavingPrompt(false)
    }
  }

  const resetPrompt = () => {
    setTempPrompt(DEFAULT_PREDICTION_PROMPT)
  }

  const clearCustomPrompt = async () => {
    setSavingPrompt(true)
    try {
      const res = await fetch('/api/automation/prompt', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ custom_prompt: null })
      })
      if (res.ok) {
        setCustomPrompt('')
        setShowPromptEditor(false)
      }
    } catch (err) {
      console.error('Error clearing prompt:', err)
    } finally {
      setSavingPrompt(false)
    }
  }

  // Webhook docs handlers
  const copyWebhookPayload = (payload: string) => {
    navigator.clipboard.writeText(payload)
    setWebhookDocsCopied(true)
    setTimeout(() => setWebhookDocsCopied(false), 2000)
  }

  // Helper to get prediction from either array or object format
  const getPrediction = (f: any) => Array.isArray(f.prediction) ? f.prediction[0] : f.prediction

  const fixturesWithPredictions = filteredFixtures.filter(f => getPrediction(f))
  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0]

  return (
    <div className="min-h-screen">
      <Header
        title="Predictions"
        subtitle="AI-powered match predictions"
      />

      {/* Data Freshness Indicators */}
      <div className="px-6 pt-4 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-muted-foreground">Data Status:</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Fixtures</span>
          <DataFreshnessBadge category="fixtures" size="sm" showInfo />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Odds</span>
          <DataFreshnessBadge category="odds" size="sm" showInfo />
        </div>
      </div>

      <div className="p-6">
        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Top row - View mode and actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2" role="tablist" aria-label="View mode">
              <button
                onClick={() => setViewMode('cards')}
                role="tab"
                aria-selected={viewMode === 'cards'}
                aria-label="Card view"
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                role="tab"
                aria-selected={viewMode === 'table'}
                aria-label="Table view"
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {fixturesWithPredictions.length} / {filteredFixtures.length} predicted
              </span>
              {/* Unified Settings Dropdown */}
              <div className="relative" data-dropdown ref={settingsDropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSettingsDropdown(!showSettingsDropdown)
                    setShowRoundFilter(false)
                    setShowModelDropdown(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
                  aria-label="Settings menu"
                  aria-expanded={showSettingsDropdown}
                  aria-haspopup="menu"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showSettingsDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 w-72">
                    {/* AI Model Section */}
                    <div className="p-3 border-b">
                      <span className="text-xs font-medium text-muted-foreground block mb-2">AI Model</span>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {AI_MODELS.map(model => (
                          <button
                            key={model.id}
                            onClick={() => handleModelChange(model.id)}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between",
                              selectedModel === model.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <span>{model.name}</span>
                            <span className={cn(
                              "text-[10px]",
                              selectedModel === model.id ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {model.provider}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Status */}
                    <div className="p-3 border-b space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Webhook Secret</span>
                        <span className={webhookSecretSet ? "text-green-500" : "text-muted-foreground"}>
                          {webhookSecretSet ? '✓ Set' : 'Not set'}
                        </span>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="p-3 space-y-2">
                      <button
                        onClick={() => {
                          setShowSettingsModal(true)
                          setShowSettingsDropdown(false)
                        }}
                        className="flex items-center gap-2 text-xs text-primary hover:underline w-full"
                      >
                        <Edit2 className="w-3 h-3" />
                        Configure Webhooks
                      </button>
                      <button
                        onClick={() => {
                          setShowWebhookDocs(true)
                          setShowSettingsDropdown(false)
                        }}
                        className="flex items-center gap-2 text-xs text-primary hover:underline w-full"
                      >
                        <FileJson className="w-3 h-3" />
                        Webhook Documentation
                      </button>
                      <button
                        onClick={openPromptEditor}
                        className="flex items-center gap-2 text-xs text-primary hover:underline w-full"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Prediction Prompt
                        {customPrompt && <span className="text-[10px] bg-primary/10 text-primary px-1 rounded ml-auto">Custom</span>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row - Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Round Filter */}
            <div className="relative" data-dropdown>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowRoundFilter(!showRoundFilter)
                  setShowModelDropdown(false)
                }}
                className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
              >
                <Filter className="w-4 h-4" />
                {selectedRounds.length === 0 ? 'All Rounds' : `Round${selectedRounds.length > 1 ? 's' : ''}: ${selectedRounds.sort((a,b) => a-b).join(', ')}`}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showRoundFilter && (
                <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                  <div className="p-2 border-b">
                    <button
                      onClick={selectAllRounds}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                        selectedRounds.length === 0 ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                    >
                      All Rounds
                    </button>
                  </div>
                  <div className="p-2 grid grid-cols-3 gap-1">
                    {availableRounds.map(round => (
                      <button
                        key={round}
                        onClick={() => toggleRound(round)}
                        className={cn(
                          "px-3 py-2 rounded text-sm transition-colors text-center",
                          selectedRounds.includes(round)
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        {round}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="relative" data-dropdown>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowModelDropdown(!showModelDropdown)
                  setShowRoundFilter(false)
                }}
                className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
              >
                <span className="text-xs text-muted-foreground">{currentModel.provider}</span>
                <span className="font-medium">{currentModel.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showModelDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg z-50 min-w-[220px]">
                  <div className="p-1">
                    {AI_MODELS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between",
                          selectedModel === model.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <span>{model.name}</span>
                        <span className={cn(
                          "text-xs",
                          selectedModel === model.id ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {model.provider}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clear filters */}
            {selectedRounds.length > 0 && (
              <button
                onClick={selectAllRounds}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Stats Section - Collapsible */}
        <div className="mb-6">
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/70 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="font-medium">Accuracy Statistics & Analysis</span>
            </div>
            {showStats ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showStats && (
            <div className="mt-4 space-y-4">
              <AccuracyStatsPanel />
              <div className="grid md:grid-cols-2 gap-4">
                <ModelComparison />
                <CalibrationChart />
              </div>
            </div>
          )}
        </div>

        {/* Live Matches - Only show if there are live matches */}
        {liveFixtures.length > 0 && (
          <div className="mb-6 space-y-4">
            <button
              onClick={() => setShowLive(!showLive)}
              className="w-full flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <h2 className="font-semibold text-lg text-red-500">Live Now</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {liveFixtures.length} match{liveFixtures.length > 1 ? 'es' : ''} in progress
                </span>
              </div>
              {showLive ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {showLive && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {liveFixtures.map((fixture: any) => (
                  <PredictionCard
                    key={fixture.id}
                    fixture={fixture}
                    isLive={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border mb-6" role="tablist" aria-label="Prediction views">
          <button
            onClick={() => setActiveTab('upcoming')}
            role="tab"
            aria-selected={activeTab === 'upcoming'}
            aria-controls="upcoming-panel"
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'upcoming'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Upcoming ({filteredFixtures.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            role="tab"
            aria-selected={activeTab === 'results'}
            aria-controls="results-panel"
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'results'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Recent Results ({filteredRecentResults.length})
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeTab === 'upcoming' ? (
          /* Upcoming Fixtures Tab */
          filteredFixtures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {fixtures.length === 0 ? 'No upcoming fixtures found' : 'No fixtures match the selected filters'}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? (
                /* Cards View */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedFixtures.map(fixture => (
                    <PredictionCard
                      key={fixture.id}
                      fixture={fixture}
                      onGeneratePrediction={handleGeneratePrediction}
                      isGenerating={generatingIds.includes(fixture.id)}
                      error={errorIds[fixture.id]}
                      onClearError={() => clearError(fixture.id)}
                    />
                  ))}
                </div>
              ) : (
                /* Table View */
                <PredictionTable
                  fixtures={paginatedFixtures}
                  onGeneratePrediction={handleGeneratePrediction}
                  generatingIds={generatingIds}
                  errorIds={errorIds}
                  onClearError={clearError}
                />
              )}

              {/* Pagination Controls - Upcoming */}
              {upcomingTotalPages > 1 && (
                <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {upcomingPage * ITEMS_PER_PAGE + 1}-{Math.min((upcomingPage + 1) * ITEMS_PER_PAGE, filteredFixtures.length)} of {filteredFixtures.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUpcomingPage(p => Math.max(0, p - 1))}
                      disabled={upcomingPage === 0}
                      aria-label="Previous page"
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        upcomingPage === 0
                          ? 'text-muted-foreground/50 cursor-not-allowed'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, upcomingTotalPages) }, (_, i) => {
                        let pageNum: number
                        if (upcomingTotalPages <= 5) {
                          pageNum = i
                        } else if (upcomingPage < 3) {
                          pageNum = i
                        } else if (upcomingPage > upcomingTotalPages - 4) {
                          pageNum = upcomingTotalPages - 5 + i
                        } else {
                          pageNum = upcomingPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setUpcomingPage(pageNum)}
                            aria-label={`Page ${pageNum + 1}`}
                            aria-current={upcomingPage === pageNum ? 'page' : undefined}
                            className={cn(
                              'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                              upcomingPage === pageNum
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            )}
                          >
                            {pageNum + 1}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => setUpcomingPage(p => Math.min(upcomingTotalPages - 1, p + 1))}
                      disabled={upcomingPage >= upcomingTotalPages - 1}
                      aria-label="Next page"
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        upcomingPage >= upcomingTotalPages - 1
                          ? 'text-muted-foreground/50 cursor-not-allowed'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          /* Recent Results Tab */
          filteredRecentResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {recentResults.length === 0 ? 'No recent results found' : 'No results match the selected filters'}
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? (
                /* Cards View */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedResults.map(fixture => (
                    <RecentResultCard
                      key={fixture.id}
                      fixture={fixture}
                    />
                  ))}
                </div>
              ) : (
                /* Table View */
                <RecentResultsTable
                  results={paginatedResults}
                />
              )}

              {/* Pagination Controls - Results */}
              {resultsTotalPages > 1 && (
                <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {resultsPage * ITEMS_PER_PAGE + 1}-{Math.min((resultsPage + 1) * ITEMS_PER_PAGE, filteredRecentResults.length)} of {filteredRecentResults.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setResultsPage(p => Math.max(0, p - 1))}
                      disabled={resultsPage === 0}
                      aria-label="Previous page"
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        resultsPage === 0
                          ? 'text-muted-foreground/50 cursor-not-allowed'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, resultsTotalPages) }, (_, i) => {
                        let pageNum: number
                        if (resultsTotalPages <= 5) {
                          pageNum = i
                        } else if (resultsPage < 3) {
                          pageNum = i
                        } else if (resultsPage > resultsTotalPages - 4) {
                          pageNum = resultsTotalPages - 5 + i
                        } else {
                          pageNum = resultsPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setResultsPage(pageNum)}
                            aria-label={`Page ${pageNum + 1}`}
                            aria-current={resultsPage === pageNum ? 'page' : undefined}
                            className={cn(
                              'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                              resultsPage === pageNum
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            )}
                          >
                            {pageNum + 1}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => setResultsPage(p => Math.min(resultsTotalPages - 1, p + 1))}
                      disabled={resultsPage >= resultsTotalPages - 1}
                      aria-label="Next page"
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        resultsPage >= resultsTotalPages - 1
                          ? 'text-muted-foreground/50 cursor-not-allowed'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Webhook Documentation Modal */}
      {showWebhookDocs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl shadow-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Webhook Documentation</h3>
              <button
                onClick={() => setShowWebhookDocs(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b overflow-x-auto">
              <div className="flex items-center px-2 text-xs text-muted-foreground border-r mr-1">AI</div>
              <button
                onClick={() => setWebhookDocsTab('prediction')}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  webhookDocsTab === 'prediction'
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Prediction
              </button>
              <button
                onClick={() => setWebhookDocsTab('analysis')}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  webhookDocsTab === 'analysis'
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Analysis
              </button>
              <div className="flex items-center px-2 text-xs text-muted-foreground border-l ml-1 mr-1">Automation</div>
              <button
                onClick={() => setWebhookDocsTab('pre-match')}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  webhookDocsTab === 'pre-match'
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Pre-Match
              </button>
              <button
                onClick={() => setWebhookDocsTab('live')}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  webhookDocsTab === 'live'
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Live
              </button>
              <button
                onClick={() => setWebhookDocsTab('post-match')}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  webhookDocsTab === 'post-match'
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Post-Match
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {webhookDocsTab === 'prediction' ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Endpoint</h4>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      POST {webhookUrl}
                    </code>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">API Route</h4>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      /api/predictions/generate
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This payload is sent when generating a prediction for an upcoming match.
                    The n8n workflow receives this data and uses it to fetch additional information
                    before generating the AI prediction.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "fixture_id": "550e8400-e29b-41d4-a716-446655440000",
  "home_team": "Liverpool",
  "home_team_id": "550e8400-e29b-41d4-a716-446655440001",
  "away_team": "Manchester City",
  "away_team_id": "550e8400-e29b-41d4-a716-446655440002",
  "match_date": "2025-01-15T15:00:00Z",
  "venue": "Anfield",
  "round": "Regular Season - 21",
  "model": "openai/gpt-5-mini",
  "custom_prompt": "You are an elite football analyst... (full prompt from Settings)",
  "memory_context": {
    "home_team_learnings": [
      {
        "learning_points": ["Strong defensive performance", "Set piece threat"],
        "key_insights": ["Home form excellent", "Clean sheets trend"],
        "created_at": "2025-01-10T12:00:00Z",
        "fixture_id": "..."
      }
    ],
    "away_team_learnings": [
      {
        "learning_points": ["Possession dominance", "Counter-attack vulnerability"],
        "key_insights": ["Away form inconsistent"],
        "created_at": "2025-01-08T12:00:00Z",
        "fixture_id": "..."
      }
    ]
  }
}`}
                    </pre>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => copyWebhookPayload(`{
  "fixture_id": "uuid",
  "home_team": "string",
  "home_team_id": "uuid",
  "away_team": "string",
  "away_team_id": "uuid",
  "match_date": "ISO date string",
  "venue": "string",
  "round": "string",
  "model": "string",
  "custom_prompt": "string (full AI prompt)",
  "memory_context": {
    "home_team_learnings": "array",
    "away_team_learnings": "array"
  }
}`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded"
                    >
                      {webhookDocsCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {webhookDocsCopied ? 'Copied!' : 'Copy Schema'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Field Descriptions</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">fixture_id</code>
                        <span className="text-muted-foreground">UUID of the fixture in the database</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">home_team / away_team</code>
                        <span className="text-muted-foreground">Team names for display and news search</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">model</code>
                        <span className="text-muted-foreground">AI model identifier (e.g., "openai/gpt-5-mini")</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">custom_prompt</code>
                        <span className="text-muted-foreground">Full AI prompt (from Settings - Edit Prediction Prompt)</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">memory_context</code>
                        <span className="text-muted-foreground">Past match analyses for both teams (learning from history)</span>
                      </div>
                    </div>
                  </div>

                  {/* Response Schema */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2 text-primary">Expected Response Schema</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      The n8n workflow should return a JSON response with this structure (saved to predictions table):
                    </p>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "prediction": "1",              // "1" | "X" | "2" | "1X" | "X2" | "12"
  "confidence_pct": 68,           // 0-100
  "overall_index": 62,            // 1-100 (weighted sum of factors)
  "home_win_pct": 55,             // 0-100
  "draw_pct": 25,                 // 0-100
  "away_win_pct": 20,             // 0-100 (must sum to 100)
  "factors": {
    "A_base_strength": { "score": 65, "weighted": 15.6, "notes": "..." },
    "B_form": { "score": 72, "weighted": 15.8, "notes": "..." },
    "C_key_players": { "score": 50, "weighted": 5.5, "notes": "..." },
    "D_tactical": { "score": 58, "weighted": 11.6, "notes": "..." },
    "E_table_position": { "score": 60, "weighted": 7.8, "notes": "..." },
    "F_h2h": { "score": 65, "weighted": 6.5, "notes": "..." }
  },
  "over_under_2_5": "Over",       // "Over" | "Under"
  "btts": "Yes",                  // "Yes" | "No"
  "value_bet": "Home Win @ 2.10 (edge: +5%)",
  "key_factors": ["Home xG advantage", "H2H dominance"],
  "risk_factors": ["Weather concerns", "Away recent form"],
  "analysis": "Detailed 200-word analysis...",
  "score_predictions": [
    { "score": "2-1", "probability": 18 },
    { "score": "1-0", "probability": 14 },
    { "score": "1-1", "probability": 12 }
  ],
  "most_likely_score": "2-1"
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : webhookDocsTab === 'analysis' ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Endpoint</h4>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      POST {analysisWebhookUrl}
                    </code>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">API Route</h4>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      /api/match-analysis/generate
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This payload is sent after a match completes to generate post-match analysis.
                    It includes the original prediction, actual match statistics, events, and odds
                    to analyze prediction accuracy.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "fixture_id": "550e8400-e29b-41d4-a716-446655440000",
  "home_team": "Liverpool",
  "home_team_id": "550e8400-e29b-41d4-a716-446655440001",
  "away_team": "Manchester City",
  "away_team_id": "550e8400-e29b-41d4-a716-446655440002",
  "actual_score": "2-1",
  "match_date": "2025-01-15T15:00:00Z",
  "prediction": {
    "prediction": "1",
    "confidence_pct": 68,
    "overall_index": 62,
    "home_win_pct": 55,
    "draw_pct": 25,
    "away_win_pct": 20,
    "factors": {
      "A_base_strength": { "score": 65, "weighted": 15.6, "notes": "..." },
      "B_form": { "score": 72, "weighted": 15.8, "notes": "..." },
      "C_key_players": { "score": 50, "weighted": 5.5, "notes": "..." },
      "D_tactical": { "score": 58, "weighted": 11.6, "notes": "..." },
      "E_table_position": { "score": 60, "weighted": 7.8, "notes": "..." },
      "F_h2h": { "score": 65, "weighted": 6.5, "notes": "..." }
    },
    "over_under_2_5": "Over",
    "btts": "Yes",
    "key_factors": ["..."],
    "risk_factors": ["..."],
    "analysis": "..."
  },
  "statistics": [
    {
      "team_id": "...",
      "shots_total": 15,
      "shots_on_target": 6,
      "possession_pct": 52,
      "passes_total": 450,
      "passes_pct": 85,
      "corners": 7,
      "expected_goals": 1.8
    }
  ],
  "events": [
    {
      "type": "Goal",
      "time_elapsed": 34,
      "team_id": "...",
      "player_name": "M. Salah",
      "assist_name": "T. Alexander-Arnold"
    }
  ],
  "odds": [
    {
      "bookmaker": "bet365",
      "home_odds": 1.85,
      "draw_odds": 3.40,
      "away_odds": 4.20
    }
  ],
  "model": "openai/gpt-5-mini"
}`}
                    </pre>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => copyWebhookPayload(`{
  "fixture_id": "uuid",
  "home_team": "string",
  "home_team_id": "uuid",
  "away_team": "string",
  "away_team_id": "uuid",
  "actual_score": "string (e.g., '2-1')",
  "match_date": "ISO date string",
  "prediction": "object (full prediction data)",
  "statistics": "array (fixture_statistics rows)",
  "events": "array (fixture_events rows)",
  "odds": "array (odds rows)",
  "model": "string"
}`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded"
                    >
                      {webhookDocsCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {webhookDocsCopied ? 'Copied!' : 'Copy Schema'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Field Descriptions</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">actual_score</code>
                        <span className="text-muted-foreground">Final score (e.g., "2-1")</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">prediction</code>
                        <span className="text-muted-foreground">Full prediction object with factors and analysis</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">statistics</code>
                        <span className="text-muted-foreground">Match statistics (shots, possession, xG, etc.)</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">events</code>
                        <span className="text-muted-foreground">Match events (goals, cards, substitutions)</span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">odds</code>
                        <span className="text-muted-foreground">Pre-match betting odds from various bookmakers</span>
                      </div>
                    </div>
                  </div>

                  {/* Response Schema */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2 text-primary">Expected Response Schema</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      The n8n workflow should return a JSON response with this structure (saved to match_analysis table):
                    </p>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "fixture_id": "uuid",
  "home_team_id": "uuid",
  "away_team_id": "uuid",
  "predicted_result": "1",        // "1" | "X" | "2" | null
  "actual_result": "1",           // "1" | "X" | "2"
  "prediction_correct": true,     // boolean
  "predicted_score": "2-1",
  "actual_score": "2-1",
  "score_correct": true,          // boolean
  "predicted_over_under": "Over",
  "actual_over_under": "Over",
  "over_under_correct": true,
  "predicted_btts": "Yes",
  "actual_btts": "Yes",
  "btts_correct": true,
  "overall_index": 62,
  "confidence_pct": 68,
  "accuracy_score": 85,           // 0-100 (overall prediction accuracy)
  "factors": {                    // Original prediction factors
    "A_base_strength": { "score": 65, "weighted": 15.6, "notes": "..." },
    ...
  },
  "factor_accuracy": {            // Per-factor accuracy assessment
    "A_base_strength": { "accurate": true, "notes": "xG prediction matched" },
    "B_form": { "accurate": true, "notes": "Form analysis correct" },
    "C_key_players": { "accurate": false, "notes": "Key player underperformed" },
    ...
  },
  "home_team_performance": {
    "xg": 1.8,
    "shots": 15,
    "possession": 52,
    "key_stats": ["Strong pressing", "Set piece threat"]
  },
  "away_team_performance": {
    "xg": 0.9,
    "shots": 8,
    "possession": 48,
    "key_stats": ["Counter-attacks limited"]
  },
  "post_match_analysis": "Detailed analysis of how the match unfolded...",
  "key_insights": [
    "Home team dominated possession as predicted",
    "Set pieces proved decisive"
  ],
  "learning_points": [
    "xG model accurately predicted goal threat",
    "Form indicators reliable for this matchup"
  ],
  "surprises": [
    "Away keeper made unexpected saves",
    "Red card changed game dynamics"
  ],
  "model_version": "openai/gpt-5-mini"
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : webhookDocsTab === 'pre-match' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-500">
                      <strong>Automation Trigger:</strong> Called by cron 30 minutes before kickoff to refresh data for upcoming matches.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Endpoint</h4>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      POST https://nn.analyserinsights.com/webhook/trigger/pre-match
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This webhook triggers data refresh for leagues with upcoming matches. The n8n workflow should call the app&apos;s refresh API to update fixtures, odds, and other pre-match data.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "league_id": "550e8400-e29b-41d4-a716-446655440000",
  "league_name": "Premier League",
  "fixtures": [
    {
      "id": "fixture-uuid-1",
      "home_team": "Liverpool",
      "away_team": "Manchester City",
      "match_date": "2025-01-15T15:00:00Z"
    },
    {
      "id": "fixture-uuid-2",
      "home_team": "Arsenal",
      "away_team": "Chelsea",
      "match_date": "2025-01-15T17:30:00Z"
    }
  ],
  "trigger_type": "pre-match"
}`}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Expected n8n Workflow Actions</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">1</code>
                        <span className="text-muted-foreground">Call <code className="bg-muted px-1 rounded">POST /api/data/refresh/phase?phase=pre-match&amp;league_id=X</code></span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">2</code>
                        <span className="text-muted-foreground">Call <code className="bg-muted px-1 rounded">POST /api/data/refresh/phase?phase=imminent&amp;league_id=X</code></span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">3</code>
                        <span className="text-muted-foreground">Return success response</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : webhookDocsTab === 'live' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-500">
                      <strong>Automation Trigger:</strong> Called every 5 minutes during live matches to refresh real-time data.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Endpoint</h4>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      POST https://nn.analyserinsights.com/webhook/trigger/live
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This webhook triggers live data refresh for leagues with matches currently in progress. Updates scores, events, and statistics in real-time.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "leagues": [
    {
      "league_id": "550e8400-e29b-41d4-a716-446655440000",
      "live_count": 3
    }
  ],
  "trigger_type": "live"
}`}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Expected n8n Workflow Actions</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">1</code>
                        <span className="text-muted-foreground">For each league, call <code className="bg-muted px-1 rounded">POST /api/data/refresh/phase?phase=live&amp;league_id=X</code></span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">2</code>
                        <span className="text-muted-foreground">Return success response with refresh count</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : webhookDocsTab === 'post-match' ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-500">
                      <strong>Automation Trigger:</strong> Called 4 hours after match ends to refresh final statistics and data.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Endpoint</h4>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      POST https://nn.analyserinsights.com/webhook/trigger/post-match
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This webhook triggers post-match data refresh for leagues with recently finished matches. Ensures all final statistics, events, and lineups are captured.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "leagues": [
    {
      "league_id": "550e8400-e29b-41d4-a716-446655440000",
      "finished_count": 2
    }
  ],
  "trigger_type": "post-match"
}`}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Expected n8n Workflow Actions</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">1</code>
                        <span className="text-muted-foreground">For each league, call <code className="bg-muted px-1 rounded">POST /api/data/refresh/phase?phase=post-match&amp;league_id=X</code></span>
                      </div>
                      <div className="flex gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs shrink-0">2</code>
                        <span className="text-muted-foreground">Return success response with refresh count</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">Note: AI Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      AI post-match analysis is triggered separately (15 minutes after post-match refresh) via the internal <code className="bg-muted px-1 rounded">/api/match-analysis/generate</code> endpoint, which calls the <strong>Analysis</strong> webhook documented in the AI tab.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Prompt Editor Modal */}
      {showPromptEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl shadow-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">Edit Factor Analysis Prompt</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize factors A-F and analysis instructions. Header (match details) and output JSON format are fixed.
                </p>
              </div>
              <button
                onClick={() => setShowPromptEditor(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Variable Reference Sidebar */}
              <div className="w-64 border-r p-3 overflow-y-auto bg-muted/30 shrink-0">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Available Variables</h4>
                <div className="space-y-1.5">
                  {PROMPT_VARIABLES.map((variable, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] font-mono bg-background border rounded px-2 py-1 break-all cursor-pointer hover:bg-muted"
                      onClick={() => {
                        navigator.clipboard.writeText(variable)
                      }}
                      title="Click to copy"
                    >
                      {variable}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Click a variable to copy it. Do not remove these placeholders as they are replaced with actual data by n8n.
                </p>
              </div>

              {/* Editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <textarea
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  className="flex-1 p-4 bg-background font-mono text-xs resize-none focus:outline-none overflow-y-auto"
                  placeholder="Enter your custom prompt..."
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <button
                  onClick={resetPrompt}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Reset to Default
                </button>
                {customPrompt && (
                  <button
                    onClick={clearCustomPrompt}
                    disabled={savingPrompt}
                    className="px-3 py-1.5 text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {savingPrompt ? 'Clearing...' : 'Clear Custom Prompt'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPromptEditor(false)}
                  className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={savePrompt}
                  disabled={savingPrompt}
                  className="flex items-center gap-1 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingPrompt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingPrompt ? 'Saving...' : 'Save Prompt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            // Refresh webhook secret status
            loadWebhookSecretStatus()
          }}
        />
      )}

    </div>
  )
}
