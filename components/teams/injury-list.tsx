'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Calendar, User } from 'lucide-react'
import type { Injury } from '@/types'

// Status color mapping based on API-Football values
const STATUS_COLORS: Record<string, string> = {
  'Missing Fixture': 'bg-red-500/10 text-red-600 border border-red-500/20',
  'Doubtful': 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  'Questionable': 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
}

// Get color for status badge
function getStatusColor(status: string | null | undefined): string {
  if (!status) return 'bg-red-500/10 text-red-600 border border-red-500/20'
  return STATUS_COLORS[status] || 'bg-red-500/10 text-red-600 border border-red-500/20'
}

// Get the injury reason - handles both new and legacy field names
function getInjuryReason(injury: Injury): string {
  return injury.injury_reason || injury.reason || 'Unknown'
}

// Get the injury status - handles both new and legacy field names
function getInjuryStatus(injury: Injury): string | null {
  return injury.injury_type || injury.type || null
}

interface InjuryListProps {
  injuries: Injury[]
  className?: string
  compact?: boolean
}

export function InjuryList({ injuries, className, compact = false }: InjuryListProps) {
  if (injuries.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground py-4", className)}>
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50 text-green-500" />
        <p className="text-sm">No injuries reported</p>
      </div>
    )
  }

  // Sort injuries by reported_date descending (most recent first)
  const sortedInjuries = [...injuries].sort((a, b) => {
    const dateA = a.reported_date ? new Date(a.reported_date).getTime() : 0
    const dateB = b.reported_date ? new Date(b.reported_date).getTime() : 0
    return dateB - dateA
  })

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        {sortedInjuries.slice(0, 3).map((injury) => (
          <div key={injury.id} className="flex items-center justify-between text-sm">
            <span className="truncate">{injury.player_name}</span>
            <span className="text-red-500 text-xs truncate ml-2">{getInjuryReason(injury)}</span>
          </div>
        ))}
        {injuries.length > 3 && (
          <p className="text-xs text-muted-foreground">
            +{injuries.length - 3} more injured
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm pb-2 border-b border-border">
        <span className="text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Injuries
        </span>
        <span className="font-medium text-red-500">{injuries.length} player{injuries.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-2">
        {sortedInjuries.map((injury) => {
          const reason = getInjuryReason(injury)
          const status = getInjuryStatus(injury)

          return (
            <div
              key={injury.id}
              className="flex items-start gap-3 p-2 bg-red-500/5 border border-red-500/10 rounded-lg"
            >
              {/* Player photo placeholder */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{injury.player_name}</p>
                <p className="text-xs text-red-500">{reason}</p>
                {status && (
                  <span className={cn(
                    "inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded",
                    getStatusColor(status)
                  )}>
                    {status}
                  </span>
                )}
                {injury.reported_date && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Reported: {new Date(injury.reported_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
