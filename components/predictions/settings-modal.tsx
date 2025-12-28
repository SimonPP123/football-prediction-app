'use client'

import { useState, useEffect } from 'react'
import { X, Save, RotateCcw, Key, Link2, Shield } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (predictionUrl: string, analysisUrl: string, secret: string) => void
  initialPredictionWebhook: string
  initialAnalysisWebhook: string
  initialWebhookSecret: string
  defaultPredictionWebhook: string
  defaultAnalysisWebhook: string
}

export function SettingsModal({
  isOpen,
  onClose,
  onSave,
  initialPredictionWebhook,
  initialAnalysisWebhook,
  initialWebhookSecret,
  defaultPredictionWebhook,
  defaultAnalysisWebhook,
}: SettingsModalProps) {
  const [predictionWebhook, setPredictionWebhook] = useState(initialPredictionWebhook)
  const [analysisWebhook, setAnalysisWebhook] = useState(initialAnalysisWebhook)
  const [webhookSecret, setWebhookSecret] = useState(initialWebhookSecret)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPredictionWebhook(initialPredictionWebhook)
      setAnalysisWebhook(initialAnalysisWebhook)
      setWebhookSecret(initialWebhookSecret)
    }
  }, [isOpen, initialPredictionWebhook, initialAnalysisWebhook, initialWebhookSecret])

  const handleSave = () => {
    onSave(predictionWebhook, analysisWebhook, webhookSecret)
  }

  const resetPredictionWebhook = () => {
    setPredictionWebhook(defaultPredictionWebhook)
  }

  const resetAnalysisWebhook = () => {
    setAnalysisWebhook(defaultAnalysisWebhook)
  }

  const clearSecret = () => {
    setWebhookSecret('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-xl shadow-lg w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Webhook Settings</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Prediction Webhook */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Link2 className="w-4 h-4 text-primary" />
              Prediction Webhook URL
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
                onClick={resetPredictionWebhook}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                title="Reset to default"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              n8n webhook for generating match predictions
            </p>
          </div>

          {/* Analysis Webhook */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Link2 className="w-4 h-4 text-primary" />
              Analysis Webhook URL
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
                onClick={resetAnalysisWebhook}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                title="Reset to default"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              n8n webhook for post-match analysis
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Shield className="w-4 h-4 text-primary" />
              Webhook Secret
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter secret for authentication..."
              />
              {webhookSecret && (
                <button
                  onClick={clearSecret}
                  className="px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                  title="Clear secret"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sent as <code className="bg-muted px-1 rounded">X-Webhook-Secret</code> header for n8n Header Auth
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Key className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-xs text-blue-500">
                <p className="font-medium mb-1">n8n Header Auth Setup</p>
                <p className="text-blue-500/80">
                  In your n8n Webhook node, set Authentication to &quot;Header Auth&quot; and create credentials with Name: <code className="bg-blue-500/20 px-1 rounded">X-Webhook-Secret</code> and Value matching this secret.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
