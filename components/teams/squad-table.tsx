'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, AlertTriangle, Users } from 'lucide-react'

interface Player {
  id: string
  name: string
  photo?: string
  position?: string
  number?: number
  nationality?: string
  age?: number
  injured?: boolean
}

interface SquadMember {
  id: string
  position: string
  number?: number
  player?: Player
}

interface SquadTableProps {
  squad: SquadMember[]
  injuries?: Array<{
    player_name: string
    injury_reason?: string | null
    reason?: string | null  // Legacy field
  }>
  className?: string
}

const POSITION_ORDER: Record<string, number> = {
  'Goalkeeper': 1,
  'Defender': 2,
  'Midfielder': 3,
  'Attacker': 4,
}

const POSITION_COLORS: Record<string, string> = {
  'Goalkeeper': 'bg-amber-500/10 text-amber-600',
  'Defender': 'bg-blue-500/10 text-blue-600',
  'Midfielder': 'bg-green-500/10 text-green-600',
  'Attacker': 'bg-red-500/10 text-red-600',
}

export function SquadTable({ squad, injuries = [], className }: SquadTableProps) {
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null)

  if (squad.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Squad information not available</p>
      </div>
    )
  }

  // Create injury lookup
  const injuredPlayers = new Set(injuries.map(i => i.player_name.toLowerCase()))

  // Group by position
  const groupedSquad = squad.reduce((acc, member) => {
    const pos = member.position || 'Unknown'
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(member)
    return acc
  }, {} as Record<string, SquadMember[]>)

  // Sort positions and players
  const sortedPositions = Object.keys(groupedSquad).sort(
    (a, b) => (POSITION_ORDER[a] || 99) - (POSITION_ORDER[b] || 99)
  )

  // Sort players by number within each position
  Object.values(groupedSquad).forEach(players => {
    players.sort((a, b) => (a.number || 99) - (b.number || 99))
  })

  const togglePosition = (pos: string) => {
    setExpandedPosition(expandedPosition === pos ? null : pos)
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Summary */}
      <div className="flex items-center justify-between text-sm pb-2 border-b border-border">
        <span className="text-muted-foreground">Total Players</span>
        <span className="font-medium">{squad.length}</span>
      </div>

      {/* Position Groups */}
      {sortedPositions.map(position => {
        const players = groupedSquad[position]
        const isExpanded = expandedPosition === position
        const injuredCount = players.filter(
          p => injuredPlayers.has(p.player?.name?.toLowerCase() || '')
        ).length

        return (
          <div key={position} className="border border-border rounded-lg overflow-hidden">
            {/* Position Header */}
            <button
              onClick={() => togglePosition(position)}
              className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  POSITION_COLORS[position] || "bg-muted text-muted-foreground"
                )}>
                  {position}
                </span>
                <span className="text-sm text-muted-foreground">
                  {players.length} player{players.length !== 1 ? 's' : ''}
                </span>
                {injuredCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertTriangle className="w-3 h-3" />
                    {injuredCount} injured
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {/* Players List */}
            {isExpanded && (
              <div className="divide-y divide-border">
                {players.map(member => {
                  const isInjured = injuredPlayers.has(member.player?.name?.toLowerCase() || '')
                  const injury = injuries.find(
                    i => i.player_name.toLowerCase() === member.player?.name?.toLowerCase()
                  )

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 p-3",
                        isInjured && "bg-red-500/5"
                      )}
                    >
                      {/* Photo */}
                      {member.player?.photo ? (
                        <img
                          src={member.player.photo}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {member.player?.name || 'Unknown'}
                          </span>
                          {isInjured && (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {member.number && <span>#{member.number}</span>}
                          {member.player?.nationality && <span>{member.player.nationality}</span>}
                          {member.player?.age && <span>{member.player.age} yrs</span>}
                        </div>
                        {isInjured && injury && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {injury.injury_reason || injury.reason || 'Injured'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
