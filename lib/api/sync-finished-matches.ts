import { createServerClient } from '@/lib/supabase/client'

/**
 * Syncs recently finished matches from API-Football.
 * This function checks for matches that started 80+ minutes ago but still show
 * as in-play in the database, then fetches their current status from the API.
 *
 * @param leagueId - Optional league ID to filter matches
 */
export async function syncFinishedMatches(leagueId?: string) {
  try {
    const supabase = createServerClient()
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

    // Find matches that started 80+ minutes ago but still show as in-play
    // (Normal matches finish in ~90 mins, this catches them early)
    let query = supabase
      .from('fixtures')
      .select('id, api_id, status')
      .in('status', ['1H', '2H', 'HT', 'ET', 'BT', 'P'])
      .lte('match_date', new Date(now.getTime() - 80 * 60 * 1000).toISOString()) // Started > 80 minutes ago
      .gte('match_date', fourHoursAgo.toISOString())

    if (leagueId) {
      query = query.eq('league_id', leagueId)
    }

    const { data: staleMatches } = await query

    if (!staleMatches || staleMatches.length === 0) return

    // Fetch current status from API-Football for these specific fixtures
    const apiIds = staleMatches.map(m => m.api_id).filter(Boolean)
    if (apiIds.length === 0) return

    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) return

    const idsParam = apiIds.join('-')
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?ids=${idsParam}`,
      {
        headers: { 'x-apisports-key': apiKey },
        next: { revalidate: 0 }
      }
    )

    if (!response.ok) return

    const data = await response.json()
    if (!data.response || !Array.isArray(data.response)) return

    // Batch update fixtures in parallel (instead of sequential N+1 queries)
    const updatePromises = data.response
      .filter((fixture: any) => fixture.fixture?.id && fixture.fixture?.status?.short)
      .map((fixture: any) => {
        const apiId = fixture.fixture.id
        const newStatus = fixture.fixture.status.short
        const elapsed = fixture.fixture.status.elapsed ?? null
        const goalsHome = fixture.goals?.home
        const goalsAway = fixture.goals?.away

        return supabase
          .from('fixtures')
          .update({
            status: newStatus,
            elapsed: elapsed,
            goals_home: goalsHome,
            goals_away: goalsAway,
            updated_at: new Date().toISOString()
          })
          .eq('api_id', apiId)
      })

    await Promise.all(updatePromises)
  } catch (error) {
    console.error('Error syncing finished matches:', error)
  }
}
