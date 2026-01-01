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
      <span className="w-20 text-slate-600 dark:text-slate-300 truncate">{label}</span>
      <div className={cn(
        "w-12 text-right tabular-nums text-blue-600 dark:text-blue-400 flex items-center justify-end gap-0.5",
        homeWinning && "font-bold"
      )}>
        {homeWinning && <span className="text-[10px]">◀</span>}
        <span>{isPercentage ? `${home}%` : home}</span>
      </div>
      <div className="flex-1 flex h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden gap-0.5">
        <div
          className="h-full transition-all rounded-l-full bg-blue-500"
          style={{ width: `${homePercent}%` }}
        />
        <div
          className="h-full transition-all rounded-r-full bg-orange-500"
          style={{ width: `${awayPercent}%` }}
        />
      </div>
      <div className={cn(
        "w-12 text-left tabular-nums text-orange-600 dark:text-orange-400 flex items-center gap-0.5",
        awayWinning && "font-bold"
      )}>
        <span>{isPercentage ? `${away}%` : away}</span>
        {awayWinning && <span className="text-[10px]">▶</span>}
      </div>
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

  // Get key events (goals, cards, substitutions)
  const keyEvents = sortedEvents.filter(e =>
    e.type === 'Goal' || e.type === 'Card' || e.type === 'subst' || e.type === 'Subst'
  ).slice(0, 10)

  const hasStats = homeStats || awayStats
  const hasEvents = events.length > 0

  if (!hasStats && !hasEvents) {
    return null
  }

  return (
    <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      {/* Key Events Timeline (always visible if there are goals/cards) */}
      {keyEvents.length > 0 && (
        <div className="space-y-1.5 mb-4 pb-3 border-b border-slate-200 dark:border-slate-600">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Match Events</div>
          {keyEvents.map((event, idx) => {
            const isHome = event.team_id === homeTeamId
            const timeDisplay = event.extra_time
              ? `${event.elapsed}+${event.extra_time}'`
              : `${event.elapsed}'`

            return (
              <div
                key={`${event.elapsed}-${event.type}-${idx}`}
                className={cn(
                  "flex items-center gap-2 text-sm py-1 px-2 rounded",
                  isHome ? "flex-row bg-blue-50 dark:bg-blue-900/20" : "flex-row-reverse bg-orange-50 dark:bg-orange-900/20"
                )}
              >
                <span className="text-slate-600 dark:text-slate-400 w-12 shrink-0 font-mono font-semibold">
                  {timeDisplay}
                </span>
                <EventIcon type={event.type} detail={event.detail} />
                <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                  {event.player_name}
                  {event.assist_name && event.type === 'Goal' && (
                    <span className="text-slate-500 dark:text-slate-400 font-normal"> ({event.assist_name})</span>
                  )}
                  {event.assist_name && (event.type === 'subst' || event.type === 'Subst') && (
                    <span className="text-slate-500 dark:text-slate-400 font-normal"> ↔ {event.assist_name}</span>
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
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            <span className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live Stats
            </span>
            {expanded ? <ChevronUp className="w-5 h-5 text-red-500" /> : <ChevronDown className="w-5 h-5 text-red-500" />}
          </button>

          {expanded && (
            <div className="space-y-2 pt-3 px-1">
              {/* Team names header - aligned above stat values */}
              <div className="flex items-center text-xs font-bold mb-3 px-1">
                <span className="w-20 text-slate-500 dark:text-slate-400">Stat</span>
                <span className="flex-1 text-center">
                  <span className="text-blue-600 dark:text-blue-400">{homeTeamName}</span>
                  <span className="text-slate-400 dark:text-slate-500 mx-2">vs</span>
                  <span className="text-orange-600 dark:text-orange-400">{awayTeamName}</span>
                </span>
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
