'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { PredictionTable } from '@/components/predictions/prediction-table'
import { LayoutGrid, List, RefreshCw, Loader2, Settings, X, Copy, Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// Default webhook URL
const DEFAULT_WEBHOOK = 'https://nn.analyserinsights.com/webhook/football-prediction'

// Expected prediction response schema
const EXPECTED_SCHEMA = {
  prediction: '"1" | "X" | "2"',
  confidence_pct: '0-100 (integer)',
  probabilities: {
    home_win_pct: '0-100 (integer)',
    draw_pct: '0-100 (integer)',
    away_win_pct: '0-100 (integer)',
  },
  over_under_2_5: '"Over" | "Under"',
  btts: '"Yes" | "No"',
  value_bet: 'string | null (e.g., "Home Win @ 1.85")',
  key_factors: 'string[] (array of key factors)',
  risk_factors: 'string[] (array of risk factors)',
  analysis: 'string (detailed analysis paragraph)',
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

  // Load webhook URL from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('prediction_webhook_url')
    if (savedUrl) {
      setWebhookUrl(savedUrl)
    }
  }, [])

  useEffect(() => {
    fetchFixtures()
  }, [])

  const fetchFixtures = async () => {
    try {
      const res = await fetch('/api/fixtures/upcoming')
      const data = await res.json()
      setFixtures(data)
    } catch (error) {
      console.error('Failed to fetch fixtures:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePrediction = async (fixtureId: string) => {
    setGeneratingIds(prev => [...prev, fixtureId])

    try {
      const res = await fetch('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixture_id: fixtureId,
          webhook_url: webhookUrl
        }),
      })

      if (res.ok) {
        // Refresh fixtures to get new prediction
        await fetchFixtures()
      }
    } catch (error) {
      console.error('Failed to generate prediction:', error)
    } finally {
      setGeneratingIds(prev => prev.filter(id => id !== fixtureId))
    }
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
    const unpredicted = fixtures.filter(f => !getPrediction(f))
    if (unpredicted.length === 0) return

    setGeneratingAll(true)

    for (const fixture of unpredicted) {
      await handleGeneratePrediction(fixture.id)
    }

    setGeneratingAll(false)
  }

  const fixturesWithPredictions = fixtures.filter(f => getPrediction(f))
  const fixturesWithoutPredictions = fixtures.filter(f => !getPrediction(f))

  return (
    <div className="min-h-screen">
      <Header
        title="Predictions"
        subtitle="AI-powered match predictions"
      />

      <div className="p-6">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
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

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {fixturesWithPredictions.length} / {fixtures.length} predicted
            </span>
            <button
              onClick={() => setShowSchema(true)}
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
              title="View expected response schema"
            >
              <Info className="w-4 h-4" />
              Schema
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm"
              title="Configure webhook URL"
            >
              <Settings className="w-4 h-4" />
              Settings
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
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : fixtures.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No upcoming fixtures found
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {fixtures.map(fixture => (
              <PredictionCard
                key={fixture.id}
                fixture={fixture}
                onGeneratePrediction={handleGeneratePrediction}
                isGenerating={generatingIds.includes(fixture.id)}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <PredictionTable
            fixtures={fixtures}
            onGeneratePrediction={handleGeneratePrediction}
            generatingIds={generatingIds}
          />
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
  "prediction": "1",           // "1" = Home Win, "X" = Draw, "2" = Away Win
  "confidence_pct": 65,        // 0-100 confidence percentage
  "probabilities": {
    "home_win_pct": 55,        // Probability percentages
    "draw_pct": 25,
    "away_win_pct": 20
  },
  "over_under_2_5": "Over",    // "Over" or "Under" 2.5 goals
  "btts": "Yes",               // Both Teams To Score: "Yes" or "No"
  "value_bet": "Home Win @ 1.85",  // Optional value bet suggestion
  "key_factors": [             // Array of key factors
    "Liverpool strong at home",
    "Arsenal missing key defender"
  ],
  "risk_factors": [            // Array of risk factors
    "Holiday fixture fatigue",
    "Arsenal recent form improving"
  ],
  "analysis": "Liverpool should edge this one at Anfield..."  // Detailed analysis
}`}
                </pre>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Field Descriptions:</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">prediction</code>
                    <span className="text-muted-foreground">Required. Match outcome: "1", "X", or "2"</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">confidence_pct</code>
                    <span className="text-muted-foreground">Required. Confidence 0-100</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">probabilities</code>
                    <span className="text-muted-foreground">Required. Win/draw percentages (should sum to 100)</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">over_under_2_5</code>
                    <span className="text-muted-foreground">Required. Goals prediction</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">btts</code>
                    <span className="text-muted-foreground">Required. Both teams to score</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="px-2 py-0.5 bg-muted rounded text-xs">value_bet</code>
                    <span className="text-muted-foreground">Optional. Betting tip with odds</span>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
