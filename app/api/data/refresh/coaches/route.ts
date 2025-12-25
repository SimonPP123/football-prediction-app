import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchCoach, ENDPOINTS } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning' | 'progress'
  message: string
  details?: {
    endpoint?: string
    recordId?: string
    recordName?: string
    progress?: { current: number; total: number }
    error?: string
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST() {
  const logs: LogEntry[] = []
  const startTime = Date.now()

  const addLog = (
    type: LogEntry['type'],
    message: string,
    details?: LogEntry['details']
  ) => {
    logs.push({ type, message, details })
    console.log(`[Refresh Coaches] ${message}`)
  }

  try {
    addLog('info', 'Starting coaches refresh...')

    // Get all teams
    const { data: teams } = await supabase.from('teams').select('id, api_id, name')

    if (!teams || teams.length === 0) {
      addLog('error', 'No teams found in database')
      return NextResponse.json({
        success: false,
        error: 'No teams found',
        logs,
      }, { status: 400 })
    }

    addLog('info', `Found ${teams.length} teams to process`)

    let imported = 0
    let errors = 0

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i]
      await delay(300) // Rate limiting

      addLog('progress', `Fetching coach for ${team.name}...`, {
        endpoint: `${ENDPOINTS.coaches.path}?team=${team.api_id}`,
        recordId: String(team.api_id),
        recordName: team.name,
        progress: { current: i + 1, total: teams.length },
      })

      try {
        const data = await fetchCoach(team.api_id)

        if (!data.response || data.response.length === 0) {
          addLog('warning', `No coach data for ${team.name}`)
          continue
        }

        // Get the current/most recent coach (first in response)
        const coach = data.response[0]

        const { error } = await supabase
          .from('coaches')
          .upsert({
            api_id: coach.id,
            name: coach.name,
            firstname: coach.firstname,
            lastname: coach.lastname,
            age: coach.age,
            birth_date: coach.birth?.date || null,
            birth_place: coach.birth?.place || null,
            birth_country: coach.birth?.country || null,
            nationality: coach.nationality,
            photo: coach.photo,
            team_id: team.id,
            career: coach.career || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'api_id' })

        if (error) {
          addLog('error', `Error for ${coach.name}: ${error.message}`, {
            recordName: coach.name,
            error: error.message,
          })
          errors++
        } else {
          addLog('success', `Updated: ${coach.name} (${team.name})`, {
            recordId: String(coach.id),
            recordName: coach.name,
          })
          imported++
        }
      } catch (err) {
        addLog('error', `Failed for ${team.name}: ${err instanceof Error ? err.message : 'Unknown'}`, {
          recordName: team.name,
          error: err instanceof Error ? err.message : 'Unknown',
        })
        errors++
      }
    }

    const duration = Date.now() - startTime
    addLog('success', `Completed: ${imported} imported, ${errors} errors (${(duration / 1000).toFixed(1)}s)`)

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: teams.length,
      duration,
      logs,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    addLog('error', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      logs,
    }, { status: 500 })
  }
}
