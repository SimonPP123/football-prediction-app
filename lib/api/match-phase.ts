/**
 * Match Phase Detection
 *
 * Detects the current phase of matches and recommends which data to refresh.
 * This enables intelligent, context-aware data synchronization.
 */

import {
  FixtureForWindow,
  categorizeFixtures,
  isLiveStatus,
  isNotStartedStatus,
  isCompletedStatus,
  getFixturesStartingSoon,
  getRecentlyCompletedFixtures,
  DATE_WINDOWS,
} from './fixture-windows'

/**
 * Match phases representing different states of the match lifecycle
 */
export type MatchPhase =
  | 'no-matches'       // No matches in the active window
  | 'week-before'      // Matches 2-7 days away
  | 'day-before'       // Matches tomorrow
  | 'matchday-morning' // Matches today, >3h away
  | 'pre-match'        // Matches in 1-3h
  | 'imminent'         // Match starting within 1 hour
  | 'live'             // Matches in progress
  | 'post-match'       // Matches finished <2h ago
  | 'day-after'        // Need to sync yesterday's results

/**
 * Refresh recommendation for a phase
 */
export interface PhaseRecommendation {
  required: string[]      // Must refresh these
  optional: string[]      // Can refresh these
  skip: string[]          // Don't bother
  nextCheckMinutes: number // When to check again
  description: string     // Human-readable description
}

/**
 * Phase detection result
 */
export interface PhaseDetectionResult {
  phase: MatchPhase
  nextMatch: FixtureForWindow | null
  nextMatchTime: Date | null
  hoursUntilNext: number | null
  liveMatches: number
  upcomingToday: number
  recentlyCompleted: number
  recommendation: PhaseRecommendation
}

/**
 * Get the time difference in hours between now and a date
 */
function getHoursDifference(date: Date): number {
  const now = new Date()
  return (date.getTime() - now.getTime()) / (1000 * 60 * 60)
}

/**
 * Detect the current match phase based on fixture data
 */
export function detectCurrentPhase(fixtures: FixtureForWindow[]): PhaseDetectionResult {
  const categorized = categorizeFixtures(fixtures)
  const now = new Date()

  // Find the next upcoming match
  const sortedUpcoming = [...categorized.upcoming].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )
  const nextMatch = sortedUpcoming[0] || null
  const nextMatchTime = nextMatch ? new Date(nextMatch.match_date) : null
  const hoursUntilNext = nextMatchTime ? getHoursDifference(nextMatchTime) : null

  // Count matches
  const liveMatches = categorized.live.length
  const upcomingToday = categorized.today.filter(f => isNotStartedStatus(f.status)).length
  const recentlyCompleted = categorized.recentlyCompleted.length

  // Detect phase
  let phase: MatchPhase

  if (liveMatches > 0) {
    phase = 'live'
  } else if (hoursUntilNext !== null && hoursUntilNext <= 1 && hoursUntilNext > 0) {
    phase = 'imminent'
  } else if (hoursUntilNext !== null && hoursUntilNext <= 3 && hoursUntilNext > 1) {
    phase = 'pre-match'
  } else if (upcomingToday > 0 && hoursUntilNext !== null && hoursUntilNext > 3) {
    phase = 'matchday-morning'
  } else if (recentlyCompleted > 0 && (liveMatches === 0 && upcomingToday === 0)) {
    // Recently finished matches, no live or upcoming today
    const hoursSinceLastMatch = categorized.recentlyCompleted.reduce((min, f) => {
      const hours = Math.abs(getHoursDifference(new Date(f.match_date)))
      return hours < min ? hours : min
    }, 24)
    phase = hoursSinceLastMatch <= 2 ? 'post-match' : 'day-after'
  } else if (hoursUntilNext !== null && hoursUntilNext <= 24) {
    phase = 'day-before'
  } else if (hoursUntilNext !== null && hoursUntilNext <= 168) { // 7 days
    phase = 'week-before'
  } else {
    phase = 'no-matches'
  }

  const recommendation = getRecommendedRefreshes(phase)

  return {
    phase,
    nextMatch,
    nextMatchTime,
    hoursUntilNext,
    liveMatches,
    upcomingToday,
    recentlyCompleted,
    recommendation,
  }
}

/**
 * Get recommended refreshes for a given phase
 */
export function getRecommendedRefreshes(phase: MatchPhase): PhaseRecommendation {
  switch (phase) {
    case 'no-matches':
      return {
        required: [],
        optional: ['standings', 'injuries'],
        skip: ['fixtures', 'lineups', 'odds', 'statistics', 'events'],
        nextCheckMinutes: 360, // Check every 6 hours
        description: 'No matches in the next week. Minimal data sync needed.',
      }

    case 'week-before':
      return {
        required: ['team-stats'],
        optional: ['injuries', 'standings', 'h2h'],
        skip: ['lineups', 'live-scores'],
        nextCheckMinutes: 240, // Check every 4 hours
        description: 'Matches coming up this week. Sync team stats and injuries.',
      }

    case 'day-before':
      return {
        required: ['injuries', 'odds'],
        optional: ['fixtures', 'weather', 'team-stats'],
        skip: ['lineups', 'statistics'],
        nextCheckMinutes: 120, // Check every 2 hours
        description: 'Match tomorrow. Sync odds and final injury updates.',
      }

    case 'matchday-morning':
      return {
        required: ['fixtures', 'injuries', 'odds'],
        optional: ['weather'],
        skip: ['team-stats', 'standings'],
        nextCheckMinutes: 60, // Check every hour
        description: 'Matchday! Sync odds and check for any late injury news.',
      }

    case 'pre-match':
      return {
        required: ['lineups', 'odds'],
        optional: ['weather', 'injuries'],
        skip: ['team-stats', 'standings', 'statistics'],
        nextCheckMinutes: 30, // Check every 30 minutes
        description: 'Match starting soon. Lineups should be available.',
      }

    case 'imminent':
      return {
        required: ['lineups'],
        optional: ['odds'],
        skip: ['team-stats', 'standings', 'injuries'],
        nextCheckMinutes: 15, // Check every 15 minutes
        description: 'Match starting very soon! Final lineup check.',
      }

    case 'live':
      return {
        required: ['live-scores'],
        optional: ['events'],
        skip: ['lineups', 'odds', 'team-stats', 'injuries'],
        nextCheckMinutes: 1, // Check every minute
        description: 'Match in progress! Live score updates.',
      }

    case 'post-match':
      return {
        required: ['statistics', 'events', 'fixtures'],
        optional: ['lineups', 'standings'],
        skip: ['odds', 'weather', 'injuries'],
        nextCheckMinutes: 30, // Check every 30 minutes
        description: 'Match just finished. Sync full statistics.',
      }

    case 'day-after':
      return {
        required: ['standings', 'statistics'],
        optional: ['events', 'team-stats'],
        skip: ['lineups', 'odds', 'weather'],
        nextCheckMinutes: 120, // Check every 2 hours
        description: 'Processing yesterday\'s results. Update standings.',
      }

    default:
      return {
        required: [],
        optional: ['fixtures'],
        skip: [],
        nextCheckMinutes: 60,
        description: 'Unknown phase. Default refresh.',
      }
  }
}

/**
 * Get a human-readable summary of the current phase
 */
export function getPhaseDisplayInfo(result: PhaseDetectionResult): {
  title: string
  subtitle: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  icon: string
} {
  const { phase, nextMatch, hoursUntilNext, liveMatches } = result

  switch (phase) {
    case 'live':
      return {
        title: `${liveMatches} match${liveMatches > 1 ? 'es' : ''} in progress`,
        subtitle: 'Live score sync active',
        urgency: 'critical',
        icon: 'play-circle',
      }

    case 'imminent':
      return {
        title: 'Kick-off imminent',
        subtitle: hoursUntilNext ? `${Math.round(hoursUntilNext * 60)} minutes away` : 'Starting soon',
        urgency: 'critical',
        icon: 'clock',
      }

    case 'pre-match':
      return {
        title: 'Pre-match phase',
        subtitle: hoursUntilNext ? `Match in ${hoursUntilNext.toFixed(1)} hours` : 'Match approaching',
        urgency: 'high',
        icon: 'users',
      }

    case 'matchday-morning':
      return {
        title: 'Matchday',
        subtitle: hoursUntilNext ? `First match in ${hoursUntilNext.toFixed(0)} hours` : 'Matches today',
        urgency: 'medium',
        icon: 'calendar',
      }

    case 'post-match':
      return {
        title: 'Post-match processing',
        subtitle: 'Syncing match statistics',
        urgency: 'medium',
        icon: 'bar-chart',
      }

    case 'day-before':
      return {
        title: 'Match tomorrow',
        subtitle: 'Preparing match data',
        urgency: 'low',
        icon: 'calendar',
      }

    case 'week-before':
      return {
        title: 'Upcoming matches',
        subtitle: nextMatch ? `Next: ${new Date(nextMatch.match_date).toLocaleDateString()}` : 'This week',
        urgency: 'low',
        icon: 'calendar',
      }

    case 'day-after':
      return {
        title: 'Post-matchday',
        subtitle: 'Finalizing results',
        urgency: 'low',
        icon: 'check-circle',
      }

    case 'no-matches':
    default:
      return {
        title: 'No upcoming matches',
        subtitle: 'Check back later',
        urgency: 'low',
        icon: 'pause-circle',
      }
  }
}

/**
 * Check if a specific endpoint should be refreshed based on current phase
 */
export function shouldRefresh(
  endpoint: string,
  phase: MatchPhase
): { should: boolean; priority: 'required' | 'optional' | 'skip' } {
  const recommendation = getRecommendedRefreshes(phase)

  if (recommendation.required.includes(endpoint)) {
    return { should: true, priority: 'required' }
  }
  if (recommendation.optional.includes(endpoint)) {
    return { should: true, priority: 'optional' }
  }
  return { should: false, priority: 'skip' }
}
