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
import { LayoutGrid, List, Loader2, Settings, X, Copy, Check, ChevronDown, ChevronUp, Filter, ExternalLink, Save, BarChart3, FileJson, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AI_MODELS } from '@/types'
import { DEFAULT_PREDICTION_PROMPT, PROMPT_VARIABLES } from '@/lib/constants/default-prompt'

// Default webhook URLs
const DEFAULT_WEBHOOK = 'https://nn.analyserinsights.com/webhook/football-prediction'
const DEFAULT_ANALYSIS_WEBHOOK = 'https://nn.analyserinsights.com/webhook/post-match-analysis'

// Parse round number from "Regular Season - X" format
const parseRoundNumber = (round: string | null): number | null => {
  if (!round) return null
  const match = round.match(/Regular Season - (\d+)/)
  return match ? parseInt(match[1], 10) : null
}

export default function PredictionsPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingIds, setGeneratingIds] = useState<string[]>([])
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK)
  const [selectedModel, setSelectedModel] = useState('openai/gpt-5.2')
  const [selectedRounds, setSelectedRounds] = useState<number[]>([])
  const [showRoundFilter, setShowRoundFilter] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [errorIds, setErrorIds] = useState<Record<string, string>>({}) // fixtureId -> error message
  const [recentResults, setRecentResults] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'upcoming' | 'results'>('upcoming')
  const [showStats, setShowStats] = useState(false)
  // Settings dropdown state
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const [editingPredictionWebhook, setEditingPredictionWebhook] = useState(false)
  const [editingAnalysisWebhook, setEditingAnalysisWebhook] = useState(false)
  const [tempPredictionWebhook, setTempPredictionWebhook] = useState('')
  const [tempAnalysisWebhook, setTempAnalysisWebhook] = useState('')
  const [analysisWebhookUrl, setAnalysisWebhookUrl] = useState(DEFAULT_ANALYSIS_WEBHOOK)
  const settingsDropdownRef = useRef<HTMLDivElement>(null)
  // Webhook documentation modal state
  const [showWebhookDocs, setShowWebhookDocs] = useState(false)
  const [webhookDocsTab, setWebhookDocsTab] = useState<'prediction' | 'analysis'>('prediction')
  const [webhookDocsCopied, setWebhookDocsCopied] = useState(false)
  // Prompt editor modal state
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [tempPrompt, setTempPrompt] = useState('')

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('prediction_webhook_url')
    if (savedUrl) {
      setWebhookUrl(savedUrl)
    }
    const savedModel = localStorage.getItem('prediction_model')
    if (savedModel) {
      setSelectedModel(savedModel)
    }
    const savedAnalysisUrl = localStorage.getItem('analysis_webhook_url')
    if (savedAnalysisUrl) {
      setAnalysisWebhookUrl(savedAnalysisUrl)
    }
    const savedPrompt = localStorage.getItem('prediction_custom_prompt')
    if (savedPrompt) {
      setCustomPrompt(savedPrompt)
    }
  }, [])

  useEffect(() => {
    fetchFixtures()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setShowRoundFilter(false)
        setShowModelDropdown(false)
        setShowSettingsDropdown(false)
        setEditingPredictionWebhook(false)
        setEditingAnalysisWebhook(false)
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

  const fetchFixtures = async () => {
    try {
      // Fetch both upcoming and all historical results in parallel
      const [upcomingRes, recentRes] = await Promise.all([
        fetch('/api/fixtures/upcoming'),
        fetch('/api/fixtures/recent-results?rounds=all')
      ])

      const upcomingData = await upcomingRes.json()
      const recentData = await recentRes.json()

      setFixtures(Array.isArray(upcomingData) ? upcomingData : [])
      setRecentResults(Array.isArray(recentData) ? recentData : [])
    } catch (error) {
      console.error('Failed to fetch fixtures:', error)
    } finally {
      setLoading(false)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixture_id: fixtureId,
          webhook_url: webhookUrl,
          model: selectedModel,
          custom_prompt: customPrompt || DEFAULT_PREDICTION_PROMPT,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Refresh fixtures to get new prediction
        await fetchFixtures()
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

  // Settings dropdown handlers
  const startEditingPredictionWebhook = () => {
    setTempPredictionWebhook(webhookUrl)
    setEditingPredictionWebhook(true)
    setEditingAnalysisWebhook(false)
  }

  const savePredictionWebhook = () => {
    setWebhookUrl(tempPredictionWebhook)
    localStorage.setItem('prediction_webhook_url', tempPredictionWebhook)
    setEditingPredictionWebhook(false)
  }

  const resetPredictionWebhook = () => {
    setWebhookUrl(DEFAULT_WEBHOOK)
    setTempPredictionWebhook(DEFAULT_WEBHOOK)
    localStorage.removeItem('prediction_webhook_url')
    setEditingPredictionWebhook(false)
  }

  const startEditingAnalysisWebhook = () => {
    setTempAnalysisWebhook(analysisWebhookUrl)
    setEditingAnalysisWebhook(true)
    setEditingPredictionWebhook(false)
  }

  const saveAnalysisWebhook = () => {
    setAnalysisWebhookUrl(tempAnalysisWebhook)
    localStorage.setItem('analysis_webhook_url', tempAnalysisWebhook)
    setEditingAnalysisWebhook(false)
  }

  const resetAnalysisWebhook = () => {
    setAnalysisWebhookUrl(DEFAULT_ANALYSIS_WEBHOOK)
    setTempAnalysisWebhook(DEFAULT_ANALYSIS_WEBHOOK)
    localStorage.removeItem('analysis_webhook_url')
    setEditingAnalysisWebhook(false)
  }

  // Prompt editor handlers
  const openPromptEditor = () => {
    setTempPrompt(customPrompt || DEFAULT_PREDICTION_PROMPT)
    setShowPromptEditor(true)
    setShowSettingsDropdown(false)
  }

  const savePrompt = () => {
    setCustomPrompt(tempPrompt)
    localStorage.setItem('prediction_custom_prompt', tempPrompt)
    setShowPromptEditor(false)
  }

  const resetPrompt = () => {
    setTempPrompt(DEFAULT_PREDICTION_PROMPT)
  }

  const clearCustomPrompt = () => {
    setCustomPrompt('')
    localStorage.removeItem('prediction_custom_prompt')
    setShowPromptEditor(false)
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

      <div className="p-6">
        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Top row - View mode and actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('cards')}
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
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showSettingsDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 w-80">
                    {/* Prediction Webhook Section */}
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Prediction Webhook</span>
                        {!editingPredictionWebhook && (
                          <button
                            onClick={startEditingPredictionWebhook}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      {editingPredictionWebhook ? (
                        <div className="space-y-2">
                          <input
                            type="url"
                            value={tempPredictionWebhook}
                            onChange={(e) => setTempPredictionWebhook(e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="https://..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={savePredictionWebhook}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={resetPredictionWebhook}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Reset
                            </button>
                            <button
                              onClick={() => setEditingPredictionWebhook(false)}
                              className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-foreground truncate" title={webhookUrl}>
                          {webhookUrl}
                        </div>
                      )}
                    </div>

                    {/* Analysis Webhook Section */}
                    <div className="p-3 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Analysis Webhook</span>
                        {!editingAnalysisWebhook && (
                          <button
                            onClick={startEditingAnalysisWebhook}
                            className="text-xs text-primary hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      {editingAnalysisWebhook ? (
                        <div className="space-y-2">
                          <input
                            type="url"
                            value={tempAnalysisWebhook}
                            onChange={(e) => setTempAnalysisWebhook(e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="https://..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveAnalysisWebhook}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={resetAnalysisWebhook}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Reset
                            </button>
                            <button
                              onClick={() => setEditingAnalysisWebhook(false)}
                              className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-foreground truncate" title={analysisWebhookUrl}>
                          {analysisWebhookUrl}
                        </div>
                      )}
                    </div>

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

                    {/* Documentation & Prompt Links */}
                    <div className="p-3 space-y-2">
                      <button
                        onClick={() => {
                          setShowWebhookDocs(true)
                          setShowSettingsDropdown(false)
                        }}
                        className="flex items-center gap-2 text-xs text-primary hover:underline w-full"
                      >
                        <FileJson className="w-3 h-3" />
                        Webhook Documentation
                        <ExternalLink className="w-3 h-3 ml-auto" />
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
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
          ) : viewMode === 'cards' ? (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFixtures.map(fixture => (
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
              fixtures={filteredFixtures}
              onGeneratePrediction={handleGeneratePrediction}
              generatingIds={generatingIds}
              errorIds={errorIds}
              onClearError={clearError}
            />
          )
        ) : (
          /* Recent Results Tab */
          filteredRecentResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {recentResults.length === 0 ? 'No recent results found' : 'No results match the selected filters'}
            </div>
          ) : viewMode === 'cards' ? (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRecentResults.map(fixture => (
                <RecentResultCard
                  key={fixture.id}
                  fixture={fixture}
                />
              ))}
            </div>
          ) : (
            /* Table View */
            <RecentResultsTable
              results={filteredRecentResults}
            />
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
            <div className="flex border-b">
              <button
                onClick={() => setWebhookDocsTab('prediction')}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  webhookDocsTab === 'prediction'
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Pre-Match (Prediction)
              </button>
              <button
                onClick={() => setWebhookDocsTab('analysis')}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  webhookDocsTab === 'analysis'
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Post-Match (Analysis)
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
  "model": "openai/gpt-5.2",
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
                        <span className="text-muted-foreground">AI model identifier (e.g., "openai/gpt-5.2")</span>
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
              ) : (
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
              )}
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
                <h3 className="text-lg font-semibold">Edit Prediction Prompt</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize the AI prompt sent to n8n. Variables in {"{{ }}"} are replaced by n8n.
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
                    className="px-3 py-1.5 text-sm text-red-500 hover:text-red-600"
                  >
                    Clear Custom Prompt
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
                  className="flex items-center gap-1 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                  Save Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
