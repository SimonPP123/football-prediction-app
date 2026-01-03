import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/auth'
import { DEFAULT_WEBHOOKS, clearWebhookConfigCache, isWebhookSecretSet } from '@/lib/automation/webhook-config'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * SSRF Protection: Validate webhook URL is not pointing to internal services
 */
function isInternalUrl(urlString: string): { internal: boolean; reason?: string } {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      return { internal: true, reason: 'Localhost addresses are not allowed' }
    }

    // Block private IP ranges
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipMatch) {
      const [, a, b, c] = ipMatch.map(Number)
      // 10.0.0.0/8
      if (a === 10) {
        return { internal: true, reason: 'Private IP range (10.x.x.x) not allowed' }
      }
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) {
        return { internal: true, reason: 'Private IP range (172.16-31.x.x) not allowed' }
      }
      // 192.168.0.0/16
      if (a === 192 && b === 168) {
        return { internal: true, reason: 'Private IP range (192.168.x.x) not allowed' }
      }
      // 169.254.0.0/16 (link-local / cloud metadata)
      if (a === 169 && b === 254) {
        return { internal: true, reason: 'Link-local/metadata IP (169.254.x.x) not allowed' }
      }
    }

    // Block common internal hostnames
    const blockedHostnames = ['metadata', 'metadata.google.internal', 'instance-data']
    if (blockedHostnames.some(blocked => hostname.includes(blocked))) {
      return { internal: true, reason: 'Cloud metadata endpoints not allowed' }
    }

    return { internal: false }
  } catch {
    return { internal: true, reason: 'Invalid URL' }
  }
}

/**
 * GET - Retrieve webhook configuration (admin only)
 */
export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { data, error } = await supabase
      .from('automation_config')
      .select('prediction_webhook_url, analysis_webhook_url, pre_match_webhook_url, live_webhook_url, post_match_webhook_url')
      .single()

    if (error) {
      console.error('[Webhooks API] Error fetching config:', error)
      return NextResponse.json({ error: 'Failed to fetch webhook config' }, { status: 500 })
    }

    // Return config with defaults and secret indicator from env var (not database)
    return NextResponse.json({
      prediction_webhook_url: data.prediction_webhook_url || DEFAULT_WEBHOOKS.prediction,
      analysis_webhook_url: data.analysis_webhook_url || DEFAULT_WEBHOOKS.analysis,
      pre_match_webhook_url: data.pre_match_webhook_url || DEFAULT_WEBHOOKS.preMatch,
      live_webhook_url: data.live_webhook_url || DEFAULT_WEBHOOKS.live,
      post_match_webhook_url: data.post_match_webhook_url || DEFAULT_WEBHOOKS.postMatch,
      webhook_secret_set: isWebhookSecretSet(), // From env var only
      // Also include whether each URL is custom or default
      is_custom: {
        prediction: !!data.prediction_webhook_url,
        analysis: !!data.analysis_webhook_url,
        pre_match: !!data.pre_match_webhook_url,
        live: !!data.live_webhook_url,
        post_match: !!data.post_match_webhook_url
      },
      defaults: DEFAULT_WEBHOOKS
    })
  } catch (err) {
    console.error('[Webhooks API] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update webhook configuration (admin only)
 */
export async function PATCH(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Validate allowed fields (webhook_secret is NOT configurable via API - use .env)
    const allowedFields = [
      'prediction_webhook_url',
      'analysis_webhook_url',
      'pre_match_webhook_url',
      'live_webhook_url',
      'post_match_webhook_url'
    ]

    const updates: Record<string, string | null> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const value = body[field]

        // Allow null/empty to reset to default
        if (value === null || value === '') {
          updates[field] = null
        } else {
          // Validate URL format for webhook URLs
          try {
            const url = new URL(value)
            if (url.protocol !== 'https:' && url.protocol !== 'http:') {
              return NextResponse.json({
                error: `Invalid URL protocol for ${field}. Must be http or https.`
              }, { status: 400 })
            }

            // SSRF protection - block internal URLs
            const ssrfCheck = isInternalUrl(value)
            if (ssrfCheck.internal) {
              return NextResponse.json({
                error: `Invalid webhook URL: ${ssrfCheck.reason}`
              }, { status: 400 })
            }

            updates[field] = value
          } catch {
            return NextResponse.json({
              error: `Invalid URL format for ${field}`
            }, { status: 400 })
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString()

    // Update the config
    const { data, error } = await supabase
      .from('automation_config')
      .update(updates)
      .eq('id', 1) // Singleton pattern
      .select('prediction_webhook_url, analysis_webhook_url, pre_match_webhook_url, live_webhook_url, post_match_webhook_url')
      .single()

    if (error) {
      console.error('[Webhooks API] Error updating config:', error)
      return NextResponse.json({ error: 'Failed to update webhook config' }, { status: 500 })
    }

    // Clear the webhook config cache so changes take effect immediately
    clearWebhookConfigCache()

    return NextResponse.json({
      success: true,
      message: 'Webhook configuration updated',
      config: {
        prediction_webhook_url: data.prediction_webhook_url || DEFAULT_WEBHOOKS.prediction,
        analysis_webhook_url: data.analysis_webhook_url || DEFAULT_WEBHOOKS.analysis,
        pre_match_webhook_url: data.pre_match_webhook_url || DEFAULT_WEBHOOKS.preMatch,
        live_webhook_url: data.live_webhook_url || DEFAULT_WEBHOOKS.live,
        post_match_webhook_url: data.post_match_webhook_url || DEFAULT_WEBHOOKS.postMatch,
        webhook_secret_set: isWebhookSecretSet() // From env var only
      }
    })
  } catch (err) {
    console.error('[Webhooks API] Unexpected error:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
