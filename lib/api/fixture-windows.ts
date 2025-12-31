/**
 * Smart Fixture Window Utilities
 *
 * Provides date-based filtering for fixtures to minimize API calls
 * by only fetching fixtures within relevant time windows.
 */

// Date window configuration
export const DATE_WINDOWS = {
  UPCOMING_DAYS: 7,        // Fetch fixtures for next 7 days
  RECENT_DAYS: 3,          // Fetch completed fixtures from past 3 days
  LINEUP_HOURS: 2,         // Lineups available ~1h before, fetch 2h window
  ODDS_DAYS: 14,           // Odds available up to 2 weeks ahead
  WEATHER_HOURS: 48,       // Weather forecast reliable for 48h
  H2H_MATCHES: 10,         // Last 10 H2H encounters
  POST_MATCH_HOURS: 24,    // Consider match "recently completed" for 24h
  STATS_BACKFILL_DAYS: 7,  // Backfill stats for up to 7 days
} as const

// Match status codes from API-Football
export const MATCH_STATUS = {
  // Not started
  NOT_STARTED: ['NS', 'TBD'],
  // In progress (live)
  LIVE: ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE'],
  // Completed
  COMPLETED: ['FT', 'AET', 'PEN'],
  // Postponed/Cancelled
  POSTPONED: ['PST', 'SUSP', 'CANC', 'ABD', 'AWD', 'WO'],
} as const

// Type for fixture from database
export interface FixtureForWindow {
  id: string
  api_id: number
  match_date: string
  status: string
  goals_home?: number | null
  goals_away?: number | null
  home_team_id?: string
  away_team_id?: string
}

// Type for categorized fixtures
export interface CategorizedFixtures {
  upcoming: FixtureForWindow[]      // NS status, match_date in future
  today: FixtureForWindow[]         // Match today (any status)
  live: FixtureForWindow[]          // Currently in progress
  recentlyCompleted: FixtureForWindow[] // Completed in past 24h
  completed: FixtureForWindow[]     // All completed fixtures
  postponed: FixtureForWindow[]     // Postponed/cancelled
}

// Type for fixture window dates
export interface FixtureWindow {
  now: Date
  recent: Date        // Start of recent window (X days ago)
  upcoming: Date      // Start of upcoming window (now)
  upcomingEnd: Date   // End of upcoming window (X days from now)
  todayStart: Date    // Start of today (midnight)
  todayEnd: Date      // End of today (23:59:59)
}

/**
 * Get the fixture window dates for smart filtering
 */
export function getFixtureWindows(
  days: { upcoming?: number; recent?: number } = {}
): FixtureWindow {
  const now = new Date()
  const upcomingDays = days.upcoming ?? DATE_WINDOWS.UPCOMING_DAYS
  const recentDays = days.recent ?? DATE_WINDOWS.RECENT_DAYS

  // Recent: X days ago
  const recent = new Date(now)
  recent.setDate(recent.getDate() - recentDays)
  recent.setHours(0, 0, 0, 0)

  // Upcoming end: X days from now
  const upcomingEnd = new Date(now)
  upcomingEnd.setDate(upcomingEnd.getDate() + upcomingDays)
  upcomingEnd.setHours(23, 59, 59, 999)

  // Today boundaries
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  return {
    now,
    recent,
    upcoming: now,
    upcomingEnd,
    todayStart,
    todayEnd,
  }
}

/**
 * Check if a match status indicates it's currently live
 */
export function isLiveStatus(status: string): boolean {
  return MATCH_STATUS.LIVE.includes(status as any)
}

/**
 * Check if a match status indicates it's completed
 */
export function isCompletedStatus(status: string): boolean {
  return MATCH_STATUS.COMPLETED.includes(status as any)
}

/**
 * Check if a match status indicates it hasn't started
 */
export function isNotStartedStatus(status: string): boolean {
  return MATCH_STATUS.NOT_STARTED.includes(status as any)
}

/**
 * Check if a match status indicates it's postponed/cancelled
 */
export function isPostponedStatus(status: string): boolean {
  return MATCH_STATUS.POSTPONED.includes(status as any)
}

/**
 * Categorize fixtures by their current state
 */
export function categorizeFixtures(fixtures: FixtureForWindow[]): CategorizedFixtures {
  const now = new Date()
  const windows = getFixtureWindows()
  const recentlyCompletedCutoff = new Date(now.getTime() - DATE_WINDOWS.POST_MATCH_HOURS * 60 * 60 * 1000)

  const result: CategorizedFixtures = {
    upcoming: [],
    today: [],
    live: [],
    recentlyCompleted: [],
    completed: [],
    postponed: [],
  }

  for (const fixture of fixtures) {
    const matchDate = new Date(fixture.match_date)

    // Check status categories
    if (isLiveStatus(fixture.status)) {
      result.live.push(fixture)
    }

    if (isCompletedStatus(fixture.status)) {
      result.completed.push(fixture)
      // Also check if recently completed (past 24h)
      if (matchDate >= recentlyCompletedCutoff) {
        result.recentlyCompleted.push(fixture)
      }
    }

    if (isPostponedStatus(fixture.status)) {
      result.postponed.push(fixture)
    }

    // Upcoming: not started AND match_date in future
    if (isNotStartedStatus(fixture.status) && matchDate > now) {
      result.upcoming.push(fixture)
    }

    // Today: match is today (any status)
    if (matchDate >= windows.todayStart && matchDate <= windows.todayEnd) {
      result.today.push(fixture)
    }
  }

  return result
}

/**
 * Get fixtures starting within the next N hours (for lineup fetching)
 */
export function getFixturesStartingSoon(
  fixtures: FixtureForWindow[],
  hours: number = DATE_WINDOWS.LINEUP_HOURS
): FixtureForWindow[] {
  const now = new Date()
  const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000)

  return fixtures.filter(fixture => {
    const matchDate = new Date(fixture.match_date)
    return (
      isNotStartedStatus(fixture.status) &&
      matchDate >= now &&
      matchDate <= cutoff
    )
  })
}

/**
 * Get fixtures that completed in the last N hours (for post-match data)
 */
export function getRecentlyCompletedFixtures(
  fixtures: FixtureForWindow[],
  hours: number = DATE_WINDOWS.POST_MATCH_HOURS
): FixtureForWindow[] {
  const now = new Date()
  const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000)

  return fixtures.filter(fixture => {
    const matchDate = new Date(fixture.match_date)
    return (
      isCompletedStatus(fixture.status) &&
      matchDate >= cutoff
    )
  })
}

/**
 * Format date for API-Football queries (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get date range parameters for API-Football fixture queries
 */
export function getSmartDateRange(
  options: { upcomingDays?: number; recentDays?: number } = {}
): { from: string; to: string } {
  const windows = getFixtureWindows({
    upcoming: options.upcomingDays,
    recent: options.recentDays,
  })

  return {
    from: formatDateForAPI(windows.recent),
    to: formatDateForAPI(windows.upcomingEnd),
  }
}

/**
 * Calculate time until match starts (for UI display)
 */
export function getTimeUntilMatch(matchDate: Date | string): {
  hours: number
  minutes: number
  isInPast: boolean
  display: string
} {
  const match = typeof matchDate === 'string' ? new Date(matchDate) : matchDate
  const now = new Date()
  const diffMs = match.getTime() - now.getTime()
  const isInPast = diffMs < 0

  const absDiffMs = Math.abs(diffMs)
  const hours = Math.floor(absDiffMs / (1000 * 60 * 60))
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60))

  let display: string
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    display = `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    display = `${hours}h ${minutes}m`
  } else {
    display = `${minutes}m`
  }

  if (isInPast) {
    display = `${display} ago`
  }

  return { hours, minutes, isInPast, display }
}

/**
 * Check if a fixture needs lineup data
 */
export function needsLineupData(fixture: FixtureForWindow & { lineup_home?: any }): boolean {
  // Only fetch lineups for fixtures starting within 2 hours or recently completed
  const now = new Date()
  const matchDate = new Date(fixture.match_date)
  const hoursUntil = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Starting within 2 hours, or completed without lineup data
  const isUpcoming = isNotStartedStatus(fixture.status) && hoursUntil <= DATE_WINDOWS.LINEUP_HOURS && hoursUntil >= -2
  const needsBackfill = isCompletedStatus(fixture.status) && !fixture.lineup_home

  return isUpcoming || needsBackfill
}

/**
 * Get summary of fixture windows for logging
 */
export function getWindowSummary(fixtures: FixtureForWindow[]): string {
  const categorized = categorizeFixtures(fixtures)
  return [
    `Total: ${fixtures.length}`,
    `Live: ${categorized.live.length}`,
    `Today: ${categorized.today.length}`,
    `Upcoming: ${categorized.upcoming.length}`,
    `Recently Completed: ${categorized.recentlyCompleted.length}`,
  ].join(' | ')
}
