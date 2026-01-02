import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET - Retrieve custom prediction prompt
 * Any authenticated user can read the prompt
 */
export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('automation_config')
      .select('custom_prediction_prompt')
      .single()

    if (error) {
      console.error('[Prompt API] Error fetching prompt:', error)
      return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 })
    }

    return NextResponse.json({
      custom_prompt: data.custom_prediction_prompt || null,
      has_custom_prompt: !!data.custom_prediction_prompt
    })
  } catch (err) {
    console.error('[Prompt API] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update custom prediction prompt
 * Any authenticated user can update the prompt
 */
export async function PATCH(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { custom_prompt } = body

    // Allow null/empty to clear the custom prompt
    const promptValue = custom_prompt && custom_prompt.trim() ? custom_prompt.trim() : null

    const { error } = await supabase
      .from('automation_config')
      .update({
        custom_prediction_prompt: promptValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1) // Singleton pattern

    if (error) {
      console.error('[Prompt API] Error updating prompt:', error)
      return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: promptValue ? 'Custom prompt saved' : 'Custom prompt cleared',
      has_custom_prompt: !!promptValue
    })
  } catch (err) {
    console.error('[Prompt API] Unexpected error:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
