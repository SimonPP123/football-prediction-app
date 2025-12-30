'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, Calendar, User } from 'lucide-react'

interface Injury {
  id: string
  player_name: string
  reason: string
  type?: string
  return_date?: string
  player_photo?: string
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

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        {injuries.slice(0, 3).map((injury) => (
          <div key={injury.id} className="flex items-center justify-between text-sm">
            <span className="truncate">{injury.player_name}</span>
            <span className="text-red-500 text-xs truncate ml-2">{injury.reason}</span>
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
        {injuries.map((injury) => (
          <div
            key={injury.id}
            className="flex items-start gap-3 p-2 bg-red-500/5 border border-red-500/10 rounded-lg"
          >
            {injury.player_photo ? (
              <img
                src={injury.player_photo}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{injury.player_name}</p>
              <p className="text-xs text-red-500">{injury.reason}</p>
              {injury.type && (
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-500/10 text-red-600 text-[10px] rounded">
                  {injury.type}
                </span>
              )}
              {injury.return_date && (
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Expected return: {new Date(injury.return_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
