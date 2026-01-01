'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamStats {
  fixture_id: string
  team_id: string
  shots_total: number | null
  shots_on_goal: number | null
  shots_off_goal: number | null
  shots_blocked: number | null
  shots_inside_box: number | null
  shots_outside_box: number | null
  corners: number | null
  offsides: number | null
  fouls: number | null
  ball_possession: number | null
  yellow_cards: number | null
  red_cards: number | null
  goalkeeper_saves: number | null
  passes_total: number | null
  passes_accurate: number | null
  passes_pct: number | null
  expected_goals: number | null
}

interface MatchEvent {
  fixture_id: string
  team_id: string | null
  elapsed: number
  extra_time: number | null
  type: string
  detail: string | null
  player_name: string | null
  assist_name: string | null
  comments: string | null
}

interface LiveStatsProps {
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  statistics: TeamStats[]
  events: MatchEvent[]
  defaultExpanded?: boolean
}

// Stat bar comparing home vs away
function StatBar({
  label,
  homeValue,
  awayValue,
  isPercentage = false,
  higherIsBetter = true,
}: {
  label: string
  homeValue: number | null
  awayValue: number | null
  isPercentage?: boolean
  higherIsBetter?: boolean
}) {
  const home = homeValue ?? 0
  const away = awayValue ?? 0
  const total = home + away || 1

  // For percentage values, use 100 as total
  const homePercent = isPercentage ? home : (home / total) * 100
  const awayPercent = isPercentage ? away : (away / total) * 100

  // Determine who's winning this stat
  const homeWinning = higherIsBetter ? home > away : home < away
  const awayWinning = higherIsBetter ? away > home : away < home

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn(
        "w-8 text-right tabular-nums font-medium",
        homeWinning && "text-green-600"
      )}>
        {isPercentage ? `${home}%` : home}
      </span>
      <div className="flex-1 flex h-2 bg-muted rounded overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            homeWinning ? "bg-green-500" : "bg-primary/60"
          )}
          style={{ width: `${homePercent}%` }}
        />
        <div
          className={cn(
            "h-full transition-all",
            awayWinning ? "bg-green-500" : "bg-primary/60"
          )}
          style={{ width: `${awayPercent}%` }}
        />
      </div>
      <span className={cn(
        "w-8 text-left tabular-nums font-medium",
        awayWinning && "text-green-600"
      )}>
        {isPercentage ? `${away}%` : away}
      </span>
      <span className="w-20 text-muted-foreground truncate">{label}</span>
    </div>
  )
}

// Event icon based on type
function EventIcon({ type, detail }: { type: string; detail: string | null }) {
  switch (type) {
    case 'Goal':
      if (detail === 'Own Goal') return <span>🔴</span>
      if (detail === 'Penalty') return <span>⚽️</span>
      return <span>⚽</span>
    case 'Card':
      return detail?.includes('Red') ? <span>🟥</span> : <span>🟨</span>
    case 'subst':
    case 'Subst':
      return <span>🔄</span>
    case 'Var':
      return <span>📺</span>
    default:
      return <span>•</span>
  }
}

export function LiveStats({
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  statistics,
  events,
  defaultExpanded = false,
}: LiveStatsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Find home and away stats
  const homeStats = statistics.find(s => s.team_id === homeTeamId)
  const awayStats = statistics.find(s => s.team_id === awayTeamId)

  // Sort events by elapsed time (most recent first for display)
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = a.elapsed + (a.extra_time || 0)
    const bTime = b.elapsed + (b.extra_time || 0)
    return bTime - aTime
  })

  // Get key events (goals, cards only)
  const keyEvents = sortedEvents.filter(e =>
    e.type === 'Goal' || e.type === 'Card'
  ).slice(0, 6)

  const hasStats = homeStats || awayStats
  const hasEvents = events.length > 0

  if (!hasStats && !hasEvents) {
    return null
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Key Events Timeline (always visible if there are goals/cards) */}
      {keyEvents.length > 0 && (
        <div className="space-y-1 mb-3">
          {keyEvents.map((event, idx) => {
            const isHome = event.team_id === homeTeamId
            const timeDisplay = event.extra_time
              ? `${event.elapsed}+${event.extra_time}'`
              : `${event.elapsed}'`

            return (
              <div
                key={`${event.elapsed}-${event.type}-${idx}`}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  isHome ? "flex-row" : "flex-row-reverse"
                )}
              >
                <span className="text-muted-foreground w-10 shrink-0">
                  {timeDisplay}
                </span>
                <EventIcon type={event.type} detail={event.detail} />
                <span className="truncate">
                  {event.player_name}
                  {event.assist_name && event.type === 'Goal' && (
                    <span className="text-muted-foreground"> ({event.assist_name})</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Expandable Stats Section */}
      {hasStats && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span className="font-medium">Live Stats</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="space-y-2 pt-2">
              {/* Team names header */}
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
                <span className="truncate max-w-[80px]">{homeTeamName}</span>
                <span className="truncate max-w-[80px]">{awayTeamName}</span>
              </div>

              {/* All Stats */}
              <StatBar
                label="Possession"
                homeValue={homeStats?.ball_possession ?? null}
                awayValue={awayStats?.ball_possession ?? null}
                isPercentage
              />
              <StatBar
                label="Shots"
                homeValue={homeStats?.shots_total ?? null}
                awayValue={awayStats?.shots_total ?? null}
              />
              <StatBar
                label="On Target"
                homeValue={homeStats?.shots_on_goal ?? null}
                awayValue={awayStats?.shots_on_goal ?? null}
              />
              <StatBar
                label="Off Target"
                homeValue={homeStats?.shots_off_goal ?? null}
                awayValue={awayStats?.shots_off_goal ?? null}
              />
              <StatBar
                label="Blocked"
                homeValue={homeStats?.shots_blocked ?? null}
                awayValue={awayStats?.shots_blocked ?? null}
              />
              <StatBar
                label="In Box"
                homeValue={homeStats?.shots_inside_box ?? null}
                awayValue={awayStats?.shots_inside_box ?? null}
              />
              <StatBar
                label="Out Box"
                homeValue={homeStats?.shots_outside_box ?? null}
                awayValue={awayStats?.shots_outside_box ?? null}
              />
              <StatBar
                label="Corners"
                homeValue={homeStats?.corners ?? null}
                awayValue={awayStats?.corners ?? null}
              />
              <StatBar
                label="Offsides"
                homeValue={homeStats?.offsides ?? null}
                awayValue={awayStats?.offsides ?? null}
                higherIsBetter={false}
              />
              <StatBar
                label="Fouls"
                homeValue={homeStats?.fouls ?? null}
                awayValue={awayStats?.fouls ?? null}
                higherIsBetter={false}
              />
              <StatBar
                label="Yellow"
                homeValue={homeStats?.yellow_cards ?? null}
                awayValue={awayStats?.yellow_cards ?? null}
                higherIsBetter={false}
              />
              <StatBar
                label="Red"
                homeValue={homeStats?.red_cards ?? null}
                awayValue={awayStats?.red_cards ?? null}
                higherIsBetter={false}
              />
              <StatBar
                label="Passes"
                homeValue={homeStats?.passes_total ?? null}
                awayValue={awayStats?.passes_total ?? null}
              />
              <StatBar
                label="Pass %"
                homeValue={homeStats?.passes_pct ?? null}
                awayValue={awayStats?.passes_pct ?? null}
                isPercentage
              />
              <StatBar
                label="Saves"
                homeValue={homeStats?.goalkeeper_saves ?? null}
                awayValue={awayStats?.goalkeeper_saves ?? null}
              />
              {(homeStats?.expected_goals != null || awayStats?.expected_goals != null) && (
                <StatBar
                  label="xG"
                  homeValue={homeStats?.expected_goals != null ? Math.round(homeStats.expected_goals * 100) / 100 : null}
                  awayValue={awayStats?.expected_goals != null ? Math.round(awayStats.expected_goals * 100) / 100 : null}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
