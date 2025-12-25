'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { PredictionTable } from '@/components/predictions/prediction-table'
import { RecentResultCard } from '@/components/predictions/recent-result-card'
import { RecentResultsTable } from '@/components/predictions/recent-results-table'
import { LayoutGrid, List, RefreshCw, Loader2, Settings, X, Copy, Check, Info, ChevronDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AI_MODELS } from '@/types'

// Default webhook URL
const DEFAULT_WEBHOOK = 'https://nn.analyserinsights.com/webhook/football-prediction'

// Expected prediction response schema
const EXPECTED_SCHEMA = {
  prediction: '"1" | "X" | "2" | "1X" | "X2" | "12"',
  confidence_pct: '0-100 (integer)',
  overall_index: '1-100 (weighted sum of factors)',
  home_win_pct: '0-100 (integer)',
  draw_pct: '0-100 (integer)',
  away_win_pct: '0-100 (integer)',
  factors: {
    A_base_strength: '{ score: 0-100, weighted: 0-18, notes: "..." }',
    B_form: '{ score: 0-100, weighted: 0-16, notes: "..." }',
    C_squad: '{ score: 0-100, weighted: 0-14, notes: "..." }',
    D_load: '{ score: 0-100, weighted: 0-10, notes: "..." }',
    E_tactical: '{ score: 0-100, weighted: 0-12, notes: "..." }',
    F_motivation: '{ score: 0-100, weighted: 0-10, notes: "..." }',
    G_referee: '{ score: 0-100, weighted: 0-5, notes: "..." }',
    H_stadium_weather: '{ score: 0-100, weighted: 0-8, notes: "..." }',
    I_h2h: '{ score: 0-100, weighted: 0-7, notes: "..." }',
  },
  over_under_2_5: '"Over" | "Under"',
  btts: '"Yes" | "No"',
  value_bet: 'string | null (e.g., "Home Win @ 1.85 (edge: +5%)")',
  key_factors: 'string[] (array of key factors)',
  risk_factors: 'string[] (array of risk factors)',
  analysis: 'string (detailed analysis paragraph)',
  score_predictions: '[{ score: "1-0", probability: 15 }, ...]',
  most_likely_score: 'string (e.g., "1-0")',
}

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
  const [generatingAll, setGeneratingAll] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSchema, setShowSchema] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK)
  const [copied, setCopied] = useState(false)
  const [selectedModel, setSelectedModel] = useState('openai/gpt-5.2')
  const [selectedRounds, setSelectedRounds] = useState<number[]>([])
  const [showRoundFilter, setShowRoundFilter] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [errorIds, setErrorIds] = useState<Record<string, string>>({}) // fixtureId -> error message
  const [generateAllStats, setGenerateAllStats] = useState<{ success: number; failed: number } | null>(null)
  const [recentResults, setRecentResults] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'results'>('upcoming')

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

  const fetchFixtures = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true)
    }
    try {
      // Fetch both upcoming and recent results in parallel
      const [upcomingRes, recentRes] = await Promise.all([
        fetch('/api/fixtures/upcoming'),
        fetch('/api/fixtures/recent-results?rounds=2')
      ])

      const upcomingData = await upcomingRes.json()
      const recentData = await recentRes.json()

      setFixtures(Array.isArray(upcomingData) ? upcomingData : [])
      setRecentResults(Array.isArray(recentData) ? recentData : [])
    } catch (error) {
      console.error('Failed to fetch fixtures:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
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

  const handleSaveWebhook = () => {
    localStorage.setItem('prediction_webhook_url', webhookUrl)
    setShowSettings(false)
  }

  const handleResetWebhook = () => {
    setWebhookUrl(DEFAULT_WEBHOOK)
    localStorage.removeItem('prediction_webhook_url')
  }

  const copySchema = () => {
    const schemaJson = JSON.stringify(EXPECTED_SCHEMA, null, 2)
    navigator.clipboard.writeText(schemaJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Helper to get prediction from either array or object format
  const getPrediction = (f: any) => Array.isArray(f.prediction) ? f.prediction[0] : f.prediction

  const handleGenerateAll = async () => {
    const unpredicted = filteredFixtures.filter(f => !getPrediction(f))
    if (unpredicted.length === 0) return

    setGeneratingAll(true)
    setGenerateAllStats(null) // Reset stats

    let success = 0
    let failed = 0

    for (const fixture of unpredicted) {
      const result = await handleGeneratePrediction(fixture.id)
      if (result) {
        success++
      } else {
        failed++
      }
    }

    setGeneratingAll(false)
    setGenerateAllStats({ success, failed })

    // Clear stats after 5 seconds
    setTimeout(() => setGenerateAllStats(null), 5000)
  }

  const fixturesWithPredictions = filteredFixtures.filter(f => getPrediction(f))
  const fixturesWithoutPredictions = filteredFixtures.filter(f => !getPrediction(f))
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
              <button
                onClick={() => setShowSchema(true)}
                className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
                title="View expected response schema"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Schema</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
                title="Configure webhook URL"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={handleGenerateAll}
                disabled={generatingAll || fixturesWithoutPredictions.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {generatingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Generate All ({fixturesWithoutPredictions.length})
              </button>
              <button
                onClick={() => fetchFixtures(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
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

        {/* Generate All Stats Notification */}
        {generateAllStats && (
          <div className={cn(
            "mb-4 p-3 rounded-lg flex items-center gap-3 text-sm",
            generateAllStats.failed > 0
              ? "bg-amber-500/10 border border-amber-500/20"
              : "bg-green-500/10 border border-green-500/20"
          )}>
            <span className={generateAllStats.failed > 0 ? "text-amber-600" : "text-green-600"}>
              Generated {generateAllStats.success} prediction{generateAllStats.success !== 1 ? 's' : ''}
              {generateAllStats.failed > 0 && (
                <span className="text-red-500"> ({generateAllStats.failed} failed)</span>
              )}
            </span>
            <button
              onClick={() => setGenerateAllStats(null)}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-6">
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl shadow-lg w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Webhook Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Prediction Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-webhook-url.com/predict"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The webhook will receive POST requests with fixture data and should return predictions.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium mb-2">Webhook receives:</p>
                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "fixture_id": "uuid",
  "home_team": "Liverpool",
  "home_team_id": "uuid",
  "away_team": "Arsenal",
  "away_team_id": "uuid",
  "match_date": "2025-12-26T15:00:00Z",
  "venue": "Anfield",
  "round": "Regular Season - 19"
}`}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={handleResetWebhook}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Reset to default
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 text-sm hover:bg-muted rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWebhook}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema Modal */}
      {showSchema && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl shadow-lg w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Expected Prediction Response</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copySchema}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowSchema(false)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your webhook should return a JSON response with the following structure:
              </p>

              <div className="bg-muted/50 rounded-lg p-4">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "prediction": "1",              // "1" | "X" | "2" | "1X" | "X2" | "12"
  "confidence_pct": 65,           // Overall confidence
  "overall_index": 62,            // Weighted sum of all factors (1-100)
  "home_win_pct": 55,             // Probability percentages
  "draw_pct": 25,
  "away_win_pct": 20,
  "factors": {                    // A-I Factor breakdown
    "A_base_strength": { "score": 65, "weighted": 11.7, "notes": "Home xG +0.5/game" },
    "B_form": { "score": 72, "weighted": 11.5, "notes": "Unbeaten in 7" },
    "C_squad": { "score": 45, "weighted": 6.3, "notes": "2 key players out" },
    "D_load": { "score": 55, "weighted": 5.5, "notes": "5 days rest" },
    "E_tactical": { "score": 60, "weighted": 7.2, "notes": "Press vs build-up" },
    "F_motivation": { "score": 50, "weighted": 5.0, "notes": "Mid-table" },
    "G_referee": { "score": 52, "weighted": 2.6, "notes": "Avg 3.2 cards/game" },
    "H_stadium_weather": { "score": 48, "weighted": 3.8, "notes": "Light rain" },
    "I_h2h": { "score": 70, "weighted": 4.9, "notes": "4W-1D-0L last 5" }
  },
  "over_under_2_5": "Over",
  "btts": "Yes",
  "value_bet": "Home Win @ 2.10 (edge: +5%)",
  "key_factors": ["Home's superior xG", "H2H dominance"],
  "risk_factors": ["Weather impact", "Away recent form"],
  "analysis": "Liverpool should edge this at Anfield...",
  "score_predictions": [{"score": "2-1", "probability": 15}],
  "most_likely_score": "2-1"
}`}
                </pre>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Field Descriptions:</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">prediction</code>
                    <span className="text-muted-foreground">Required. Match outcome: "1", "X", "2", "1X", "X2", or "12"</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">overall_index</code>
                    <span className="text-muted-foreground">Required. Weighted sum of factors (1-100). &gt;50 favors home.</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">factors</code>
                    <span className="text-muted-foreground">Required. A-I factor breakdown with score, weighted, notes</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">home/draw/away_pct</code>
                    <span className="text-muted-foreground">Required. Win/draw percentages (should sum to 100)</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">over_under_2_5</code>
                    <span className="text-muted-foreground">Required. Goals prediction: "Over" or "Under"</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">btts</code>
                    <span className="text-muted-foreground">Required. Both teams to score: "Yes" or "No"</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">value_bet</code>
                    <span className="text-muted-foreground">Optional. Betting tip with odds and edge</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">key_factors</code>
                    <span className="text-muted-foreground">Required. Array of positive factors</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">risk_factors</code>
                    <span className="text-muted-foreground">Required. Array of risk factors</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">analysis</code>
                    <span className="text-muted-foreground">Required. Detailed analysis text</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">score_predictions</code>
                    <span className="text-muted-foreground">Optional. Array of score predictions with probabilities</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
