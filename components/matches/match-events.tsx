'use client'

import { cn } from '@/lib/utils'

interface MatchEvent {
  id?: string
  type: string
  detail?: string
  time_elapsed: number
  time_extra?: number
  team_id: string
  player_name?: string
  assist_name?: string
}

interface MatchEventsProps {
  events: MatchEvent[]
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
}

function getEventIcon(type: string, detail?: string) {
  switch (type) {
    case 'Goal':
      return '⚽'
    case 'Card':
      return detail === 'Yellow Card' ? '🟨' : '🟥'
    case 'subst':
    case 'Substitution':
      return '🔄'
    case 'Var':
      return '📺'
    default:
      return '•'
  }
}

function getEventColor(type: string, detail?: string) {
  switch (type) {
    case 'Goal':
      return 'bg-green-500 text-white'
    case 'Card':
      return detail === 'Yellow Card' ? 'bg-yellow-500' : 'bg-red-500 text-white'
    case 'subst':
    case 'Substitution':
      return 'bg-blue-500 text-white'
    case 'Var':
      return 'bg-purple-500 text-white'
    default:
      return 'bg-muted'
  }
}

export function MatchEvents({
  events,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: MatchEventsProps) {
  // Filter to relevant events and sort by time
  const relevantEvents = events
    .filter(e => ['Goal', 'Card', 'subst', 'Substitution', 'Var'].includes(e.type))
    .sort((a, b) => a.time_elapsed - b.time_elapsed)

  if (relevantEvents.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No events recorded for this match
      </div>
    )
  }

  // Group events by half
  const firstHalfEvents = relevantEvents.filter(e => e.time_elapsed <= 45 || (e.time_elapsed === 45 && e.time_extra))
  const secondHalfEvents = relevantEvents.filter(e => e.time_elapsed > 45 && (e.time_elapsed <= 90 || (e.time_elapsed === 90 && e.time_extra)))
  const extraTimeEvents = relevantEvents.filter(e => e.time_elapsed > 90 && !(e.time_elapsed === 90 && e.time_extra))

  const renderEvent = (event: MatchEvent) => {
    const isHome = event.team_id === homeTeamId

    return (
      <div
        key={`${event.time_elapsed}-${event.player_name}-${event.type}`}
        className={cn(
          "flex items-center gap-3 py-2",
          isHome ? "flex-row" : "flex-row-reverse"
        )}
      >
        {/* Time */}
        <span className="text-sm text-muted-foreground w-12 shrink-0 text-center">
          {event.time_elapsed}'
          {event.time_extra && <span className="text-xs">+{event.time_extra}</span>}
        </span>

        {/* Event icon */}
        <span className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0",
          getEventColor(event.type, event.detail)
        )}>
          {getEventIcon(event.type, event.detail)}
        </span>

        {/* Event details */}
        <div className={cn(
          "flex-1 min-w-0",
          isHome ? "text-left" : "text-right"
        )}>
          <p className="font-medium text-sm truncate">
            {event.player_name || 'Unknown'}
          </p>
          {event.assist_name && event.type === 'Goal' && (
            <p className="text-xs text-muted-foreground">
              Assist: {event.assist_name}
            </p>
          )}
          {event.detail && event.type !== 'Goal' && (
            <p className="text-xs text-muted-foreground">
              {event.detail}
            </p>
          )}
        </div>
      </div>
    )
  }

  const renderHalf = (title: string, halfEvents: MatchEvent[]) => {
    if (halfEvents.length === 0) return null

    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-2 border-b border-border">
          {title}
        </div>
        <div className="divide-y divide-border/50">
          {halfEvents.map(renderEvent)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Team headers */}
      <div className="flex justify-between items-center text-sm font-medium pb-2">
        <span className="text-home">{homeTeamName}</span>
        <span className="text-away">{awayTeamName}</span>
      </div>

      {/* Events by half */}
      {renderHalf('First Half', firstHalfEvents)}
      {renderHalf('Second Half', secondHalfEvents)}
      {renderHalf('Extra Time', extraTimeEvents)}

      {/* Legend */}
      <div className="flex justify-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[10px]">⚽</span>
          Goal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[10px]">🟨</span>
          Yellow
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px]">🟥</span>
          Red
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px]">🔄</span>
          Sub
        </span>
      </div>
    </div>
  )
}
