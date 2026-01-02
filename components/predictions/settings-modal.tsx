'use client'

import { useState, useEffect } from 'react'
import { X, Save, RotateCcw, ExternalLink, Shield, Loader2, Zap, Clock, ChevronDown, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'

// Default webhook URLs
const DEFAULT_WEBHOOKS = {
  prediction: 'https://nn.analyserinsights.com/webhook/football-prediction',
  analysis: 'https://nn.analyserinsights.com/webhook/post-match-analysis',
  preMatch: 'https://nn.analyserinsights.com/webhook/trigger/pre-match',
  live: 'https://nn.analyserinsights.com/webhook/trigger/live',
  postMatch: 'https://nn.analyserinsights.com/webhook/trigger/post-match'
}

interface WebhookFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  defaultValue: string
  description: string
  color: string
}

function WebhookField({ label, value, onChange, defaultValue, description, color }: WebhookFieldProps) {
  const isDefault = value === defaultValue

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          {label}
        </label>
        {!isDefault && (
          <button
            onClick={() => onChange(defaultValue)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Reset to default"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono ${
          isDefault ? 'text-muted-foreground' : 'text-foreground'
        }`}
        placeholder="https://..."
      />
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
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
  const [showHelp, setShowHelp] = useState(false)

  // Collapsed sections state
  const [aiExpanded, setAiExpanded] = useState(true)
  const [automationExpanded, setAutomationExpanded] = useState(false)

  // AI Webhooks
  const [predictionWebhook, setPredictionWebhook] = useState(DEFAULT_WEBHOOKS.prediction)
  const [analysisWebhook, setAnalysisWebhook] = useState(DEFAULT_WEBHOOKS.analysis)

  // Automation Webhooks
  const [preMatchWebhook, setPreMatchWebhook] = useState(DEFAULT_WEBHOOKS.preMatch)
  const [liveWebhook, setLiveWebhook] = useState(DEFAULT_WEBHOOKS.live)
  const [postMatchWebhook, setPostMatchWebhook] = useState(DEFAULT_WEBHOOKS.postMatch)

  // Secret status (read-only)
  const [secretSet, setSecretSet] = useState(false)

  // Track if any changes were made
  const hasChanges =
    predictionWebhook !== DEFAULT_WEBHOOKS.prediction ||
    analysisWebhook !== DEFAULT_WEBHOOKS.analysis ||
    preMatchWebhook !== DEFAULT_WEBHOOKS.preMatch ||
    liveWebhook !== DEFAULT_WEBHOOKS.live ||
    postMatchWebhook !== DEFAULT_WEBHOOKS.postMatch

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

      // Check if any custom URLs are set to expand the right section
      const hasCustomAi = data.is_custom?.prediction || data.is_custom?.analysis
      const hasCustomAutomation = data.is_custom?.pre_match || data.is_custom?.live || data.is_custom?.post_match

      if (hasCustomAi) setAiExpanded(true)
      if (hasCustomAutomation) setAutomationExpanded(true)
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

      // Send null for defaults to reset, or the custom value
      updates.prediction_webhook_url = predictionWebhook !== DEFAULT_WEBHOOKS.prediction ? predictionWebhook : null
      updates.analysis_webhook_url = analysisWebhook !== DEFAULT_WEBHOOKS.analysis ? analysisWebhook : null
      updates.pre_match_webhook_url = preMatchWebhook !== DEFAULT_WEBHOOKS.preMatch ? preMatchWebhook : null
      updates.live_webhook_url = liveWebhook !== DEFAULT_WEBHOOKS.live ? liveWebhook : null
      updates.post_match_webhook_url = postMatchWebhook !== DEFAULT_WEBHOOKS.postMatch ? postMatchWebhook : null

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

  const resetAllToDefaults = () => {
    setPredictionWebhook(DEFAULT_WEBHOOKS.prediction)
    setAnalysisWebhook(DEFAULT_WEBHOOKS.analysis)
    setPreMatchWebhook(DEFAULT_WEBHOOKS.preMatch)
    setLiveWebhook(DEFAULT_WEBHOOKS.live)
    setPostMatchWebhook(DEFAULT_WEBHOOKS.postMatch)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-xl shadow-lg w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Webhook Configuration</h3>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="p-3 bg-blue-500/10 border-b border-blue-500/20 text-xs">
            <p className="font-medium text-blue-500 mb-1">n8n Webhook Setup</p>
            <p className="text-muted-foreground">
              In n8n, set Webhook Authentication to &quot;Header Auth&quot; with:
            </p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              <li>Name: <code className="bg-muted px-1 rounded">X-Webhook-Secret</code></li>
              <li>Value: Your secret from the <code className="bg-muted px-1 rounded">.env</code> file</li>
            </ul>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Authentication Status */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Webhook Secret</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${secretSet ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className={`text-xs ${secretSet ? 'text-green-600' : 'text-yellow-600'}`}>
                    {secretSet ? 'Configured' : 'Not set'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2 ml-1">
                Set via <code className="bg-muted px-1 rounded">N8N_WEBHOOK_SECRET</code> in .env file
              </p>

              {/* AI Webhooks Section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setAiExpanded(!aiExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">AI Webhooks</span>
                    <span className="text-xs text-muted-foreground">(Predictions & Analysis)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${aiExpanded ? 'rotate-180' : ''}`} />
                </button>

                {aiExpanded && (
                  <div className="p-3 pt-0 space-y-4 border-t">
                    <WebhookField
                      label="Prediction"
                      value={predictionWebhook}
                      onChange={setPredictionWebhook}
                      defaultValue={DEFAULT_WEBHOOKS.prediction}
                      description="Generates AI match predictions"
                      color="bg-green-500"
                    />
                    <WebhookField
                      label="Post-Match Analysis"
                      value={analysisWebhook}
                      onChange={setAnalysisWebhook}
                      defaultValue={DEFAULT_WEBHOOKS.analysis}
                      description="Generates AI analysis after matches"
                      color="bg-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Automation Webhooks Section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setAutomationExpanded(!automationExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Automation Webhooks</span>
                    <span className="text-xs text-muted-foreground">(Data Sync)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${automationExpanded ? 'rotate-180' : ''}`} />
                </button>

                {automationExpanded && (
                  <div className="p-3 pt-0 space-y-4 border-t">
                    <WebhookField
                      label="Pre-Match"
                      value={preMatchWebhook}
                      onChange={setPreMatchWebhook}
                      defaultValue={DEFAULT_WEBHOOKS.preMatch}
                      description="Triggers ~30 min before kickoff"
                      color="bg-orange-500"
                    />
                    <WebhookField
                      label="Live"
                      value={liveWebhook}
                      onChange={setLiveWebhook}
                      defaultValue={DEFAULT_WEBHOOKS.live}
                      description="Triggers every 5 min during matches"
                      color="bg-red-500"
                    />
                    <WebhookField
                      label="Post-Match"
                      value={postMatchWebhook}
                      onChange={setPostMatchWebhook}
                      defaultValue={DEFAULT_WEBHOOKS.postMatch}
                      description="Triggers ~6 hours after full time"
                      color="bg-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Reset All Button */}
              {hasChanges && (
                <button
                  onClick={resetAllToDefaults}
                  className="w-full flex items-center justify-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset all to defaults
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30 shrink-0">
          <a
            href="/docs/api-reference"
            target="_blank"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            API Docs
          </a>
          <div className="flex items-center gap-2">
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
                <CheckCircle2 className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
