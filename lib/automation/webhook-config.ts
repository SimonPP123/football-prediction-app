import { createClient } from '@supabase/supabase-js'

// Use service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Default webhook URLs (fallbacks if database is empty)
export const DEFAULT_WEBHOOKS = {
  prediction: 'https://nn.analyserinsights.com/webhook/football-prediction',
  analysis: 'https://nn.analyserinsights.com/webhook/post-match-analysis',
  preMatch: 'https://nn.analyserinsights.com/webhook/trigger/pre-match',
  live: 'https://nn.analyserinsights.com/webhook/trigger/live',
  postMatch: 'https://nn.analyserinsights.com/webhook/trigger/post-match'
}

export interface WebhookConfig {
  prediction_webhook_url: string | null
  analysis_webhook_url: string | null
  pre_match_webhook_url: string | null
  live_webhook_url: string | null
  post_match_webhook_url: string | null
  webhook_secret: string | null
}

// Cache webhook config to avoid repeated DB calls
let cachedConfig: WebhookConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60000 // 1 minute cache

/**
 * Fetches webhook configuration from the database with caching
 */
export async function getWebhookConfig(): Promise<WebhookConfig> {
  const now = Date.now()

  // Return cached config if still valid
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedConfig
  }

  try {
    const { data, error } = await supabase
      .from('automation_config')
      .select('prediction_webhook_url, analysis_webhook_url, pre_match_webhook_url, live_webhook_url, post_match_webhook_url, webhook_secret')
      .single()

    if (error) {
      console.error('[Webhook Config] Error fetching config:', error.message)
      // Return empty config on error (will use env var fallbacks)
      return {
        prediction_webhook_url: null,
        analysis_webhook_url: null,
        pre_match_webhook_url: null,
        live_webhook_url: null,
        post_match_webhook_url: null,
        webhook_secret: null
      }
    }

    // Update cache
    cachedConfig = data
    cacheTimestamp = now

    return data
  } catch (err) {
    console.error('[Webhook Config] Unexpected error:', err)
    return {
      prediction_webhook_url: null,
      analysis_webhook_url: null,
      pre_match_webhook_url: null,
      live_webhook_url: null,
      post_match_webhook_url: null,
      webhook_secret: null
    }
  }
}

/**
 * Gets a specific webhook URL with fallback to env var and default
 */
export async function getWebhookUrl(
  type: 'prediction' | 'analysis' | 'pre-match' | 'live' | 'post-match'
): Promise<string> {
  const config = await getWebhookConfig()

  switch (type) {
    case 'prediction':
      return config.prediction_webhook_url ||
             process.env.N8N_PREDICTION_WEBHOOK ||
             DEFAULT_WEBHOOKS.prediction

    case 'analysis':
      return config.analysis_webhook_url ||
             process.env.N8N_ANALYSIS_WEBHOOK ||
             DEFAULT_WEBHOOKS.analysis

    case 'pre-match':
      return config.pre_match_webhook_url ||
             (process.env.N8N_WEBHOOK_BASE_URL ? `${process.env.N8N_WEBHOOK_BASE_URL}/trigger/pre-match` : null) ||
             DEFAULT_WEBHOOKS.preMatch

    case 'live':
      return config.live_webhook_url ||
             (process.env.N8N_WEBHOOK_BASE_URL ? `${process.env.N8N_WEBHOOK_BASE_URL}/trigger/live` : null) ||
             DEFAULT_WEBHOOKS.live

    case 'post-match':
      return config.post_match_webhook_url ||
             (process.env.N8N_WEBHOOK_BASE_URL ? `${process.env.N8N_WEBHOOK_BASE_URL}/trigger/post-match` : null) ||
             DEFAULT_WEBHOOKS.postMatch

    default:
      throw new Error(`Unknown webhook type: ${type}`)
  }
}

/**
 * Gets the webhook secret from environment variable only
 * Note: Secret is ONLY configurable via .env file, not the database
 */
export function getWebhookSecret(): string {
  return process.env.N8N_WEBHOOK_SECRET || ''
}

/**
 * Checks if webhook secret is configured in environment
 */
export function isWebhookSecretSet(): boolean {
  return !!process.env.N8N_WEBHOOK_SECRET
}

/**
 * Clears the webhook config cache (useful after updates)
 */
export function clearWebhookConfigCache(): void {
  cachedConfig = null
  cacheTimestamp = 0
}
