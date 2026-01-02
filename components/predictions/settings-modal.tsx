'use client'

import { useState, useEffect } from 'react'
import { X, Save, RotateCcw, Key, Link2, Shield, Loader2, Zap, Clock } from 'lucide-react'

// Default webhook URLs
const DEFAULT_WEBHOOKS = {
  prediction: 'https://nn.analyserinsights.com/webhook/football-prediction',
  analysis: 'https://nn.analyserinsights.com/webhook/post-match-analysis',
  preMatch: 'https://nn.analyserinsights.com/webhook/trigger/pre-match',
  live: 'https://nn.analyserinsights.com/webhook/trigger/live',
  postMatch: 'https://nn.analyserinsights.com/webhook/trigger/post-match'
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export function SettingsModal({
  isOpen,
  onClose,
  onSaved,
}: SettingsModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI Webhooks
  const [predictionWebhook, setPredictionWebhook] = useState(DEFAULT_WEBHOOKS.prediction)
  const [analysisWebhook, setAnalysisWebhook] = useState(DEFAULT_WEBHOOKS.analysis)

  // Automation Webhooks
  const [preMatchWebhook, setPreMatchWebhook] = useState(DEFAULT_WEBHOOKS.preMatch)
  const [liveWebhook, setLiveWebhook] = useState(DEFAULT_WEBHOOKS.live)
  const [postMatchWebhook, setPostMatchWebhook] = useState(DEFAULT_WEBHOOKS.postMatch)

  // Secret status (read-only, configured via .env only)
  const [secretSet, setSecretSet] = useState(false)

  // Load config from API when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/automation/webhooks', {
        credentials: 'include'
      })
      if (!res.ok) {
        throw new Error('Failed to load webhook configuration')
      }
      const data = await res.json()

      setPredictionWebhook(data.prediction_webhook_url || DEFAULT_WEBHOOKS.prediction)
      setAnalysisWebhook(data.analysis_webhook_url || DEFAULT_WEBHOOKS.analysis)
      setPreMatchWebhook(data.pre_match_webhook_url || DEFAULT_WEBHOOKS.preMatch)
      setLiveWebhook(data.live_webhook_url || DEFAULT_WEBHOOKS.live)
      setPostMatchWebhook(data.post_match_webhook_url || DEFAULT_WEBHOOKS.postMatch)
      setSecretSet(data.webhook_secret_set || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updates: Record<string, string | null> = {}

      // Only send values that differ from defaults (to allow reset)
      if (predictionWebhook !== DEFAULT_WEBHOOKS.prediction) {
        updates.prediction_webhook_url = predictionWebhook
      } else {
        updates.prediction_webhook_url = null // Reset to default
      }

      if (analysisWebhook !== DEFAULT_WEBHOOKS.analysis) {
        updates.analysis_webhook_url = analysisWebhook
      } else {
        updates.analysis_webhook_url = null
      }

      if (preMatchWebhook !== DEFAULT_WEBHOOKS.preMatch) {
        updates.pre_match_webhook_url = preMatchWebhook
      } else {
        updates.pre_match_webhook_url = null
      }

      if (liveWebhook !== DEFAULT_WEBHOOKS.live) {
        updates.live_webhook_url = liveWebhook
      } else {
        updates.live_webhook_url = null
      }

      if (postMatchWebhook !== DEFAULT_WEBHOOKS.postMatch) {
        updates.post_match_webhook_url = postMatchWebhook
      } else {
        updates.post_match_webhook_url = null
      }

      // Note: webhook_secret is NOT configurable via UI - it's set via .env file only

      const res = await fetch('/api/automation/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save configuration')
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-lg font-semibold">Webhook Settings</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                  {error}
                </div>
              )}

              {/* AI Webhooks Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI Webhooks</h4>
                </div>

                {/* Prediction Webhook */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Link2 className="w-4 h-4 text-green-500" />
                    Prediction Webhook
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={predictionWebhook}
                      onChange={(e) => setPredictionWebhook(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                    <button
                      onClick={() => setPredictionWebhook(DEFAULT_WEBHOOKS.prediction)}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                      title="Reset to default"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generates match predictions via AI
                  </p>
                </div>

                {/* Analysis Webhook */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    Analysis Webhook
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={analysisWebhook}
                      onChange={(e) => setAnalysisWebhook(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                    <button
                      onClick={() => setAnalysisWebhook(DEFAULT_WEBHOOKS.analysis)}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                      title="Reset to default"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generates post-match analysis via AI
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Automation Webhooks Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Automation Webhooks</h4>
                </div>

                {/* Pre-Match Webhook */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Link2 className="w-4 h-4 text-orange-500" />
                    Pre-Match Webhook
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={preMatchWebhook}
                      onChange={(e) => setPreMatchWebhook(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                    <button
                      onClick={() => setPreMatchWebhook(DEFAULT_WEBHOOKS.preMatch)}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                      title="Reset to default"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Triggered ~30 min before kickoff for data refresh
                  </p>
                </div>

                {/* Live Webhook */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Link2 className="w-4 h-4 text-red-500" />
                    Live Webhook
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={liveWebhook}
                      onChange={(e) => setLiveWebhook(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                    <button
                      onClick={() => setLiveWebhook(DEFAULT_WEBHOOKS.live)}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                      title="Reset to default"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Triggered every 5 min during live matches
                  </p>
                </div>

                {/* Post-Match Webhook */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Link2 className="w-4 h-4 text-purple-500" />
                    Post-Match Webhook
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={postMatchWebhook}
                      onChange={(e) => setPostMatchWebhook(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                    <button
                      onClick={() => setPostMatchWebhook(DEFAULT_WEBHOOKS.postMatch)}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                      title="Reset to default"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Triggered ~6 hours after match for final data sync
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Webhook Secret - Read Only */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Webhook Secret
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${secretSet ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm">
                    {secretSet ? 'Configured' : 'Not configured'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The webhook secret is configured via the <code className="bg-muted px-1 rounded">N8N_WEBHOOK_SECRET</code> environment variable in your <code className="bg-muted px-1 rounded">.env</code> file. It is sent as <code className="bg-muted px-1 rounded">X-Webhook-Secret</code> header for all webhooks.
                </p>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Key className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div className="text-xs text-blue-500">
                    <p className="font-medium mb-1">n8n Header Auth Setup</p>
                    <p className="text-blue-500/80">
                      In your n8n Webhook nodes, set Authentication to &quot;Header Auth&quot; with Name: <code className="bg-blue-500/20 px-1 rounded">X-Webhook-Secret</code> and Value matching this secret.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/30 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
