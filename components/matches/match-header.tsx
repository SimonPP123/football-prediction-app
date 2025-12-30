'use client'

import { cn } from '@/lib/utils'
import { MapPin, Calendar, Clock, Trophy } from 'lucide-react'

interface Team {
  name: string
  logo?: string
}

interface Venue {
  name: string
  city?: string
}

interface MatchHeaderProps {
  homeTeam: Team
  awayTeam: Team
  goalsHome?: number | null
  goalsAway?: number | null
  status: string
  matchDate: string
  venue?: Venue | null
  round?: string | null
  halfTimeScore?: { home: number; away: number } | null
  compact?: boolean
}

export function MatchHeader({
  homeTeam,
  awayTeam,
  goalsHome,
  goalsAway,
  status,
  matchDate,
  venue,
  round,
  halfTimeScore,
  compact = false,
}: MatchHeaderProps) {
  const isCompleted = ['FT', 'AET', 'PEN'].includes(status)
  const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(status)

  const getStatusDisplay = () => {
    switch (status) {
      case 'FT': return 'Full Time'
      case 'AET': return 'After Extra Time'
      case 'PEN': return 'After Penalties'
      case 'NS': return 'Not Started'
      case 'TBD': return 'TBD'
      case '1H': return '1st Half'
      case '2H': return '2nd Half'
      case 'HT': return 'Half Time'
      case 'ET': return 'Extra Time'
      case 'P': return 'Penalties'
      default: return status
    }
  }

  return (
    <div className={cn("bg-card border border-border rounded-lg", compact ? "p-4" : "p-6")}>
      {/* Match info */}
      <div className={cn("text-center", compact ? "mb-3" : "mb-4")}>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground flex-wrap">
          {round && (
            <div className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>{round}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {new Date(matchDate).toLocaleDateString('en-GB', {
                weekday: compact ? 'short' : 'long',
                day: 'numeric',
                month: compact ? 'short' : 'long',
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {new Date(matchDate).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        {venue && !compact && (
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{venue.name}{venue.city ? `, ${venue.city}` : ''}</span>
          </div>
        )}
      </div>

      {/* Teams and Score */}
      <div className="flex items-center justify-center gap-4 md:gap-8">
        {/* Home Team */}
        <div className={cn("text-center flex-1", compact ? "min-w-0" : "")}>
          {homeTeam.logo && (
            <img
              src={homeTeam.logo}
              alt={homeTeam.name}
              className={cn(
                "mx-auto mb-2 object-contain",
                compact ? "w-12 h-12" : "w-20 h-20"
              )}
            />
          )}
          <h2 className={cn(
            "font-bold",
            compact ? "text-sm truncate" : "text-lg"
          )}>
            {homeTeam.name}
          </h2>
        </div>

        {/* Score / Status */}
        <div className="text-center shrink-0">
          {isCompleted || isLive ? (
            <>
              <div className={cn(
                "font-bold",
                compact ? "text-2xl" : "text-4xl",
                isLive && "text-green-500"
              )}>
                {goalsHome ?? 0} - {goalsAway ?? 0}
              </div>
              {isLive && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded mt-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </>
          ) : (
            <div className={cn(
              "font-bold text-muted-foreground",
              compact ? "text-xl" : "text-2xl"
            )}>
              vs
            </div>
          )}
          <div className={cn(
            "text-muted-foreground mt-1",
            compact ? "text-xs" : "text-sm"
          )}>
            {getStatusDisplay()}
          </div>
          {halfTimeScore && !compact && (
            <div className="text-xs text-muted-foreground">
              HT: {halfTimeScore.home} - {halfTimeScore.away}
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className={cn("text-center flex-1", compact ? "min-w-0" : "")}>
          {awayTeam.logo && (
            <img
              src={awayTeam.logo}
              alt={awayTeam.name}
              className={cn(
                "mx-auto mb-2 object-contain",
                compact ? "w-12 h-12" : "w-20 h-20"
              )}
            />
          )}
          <h2 className={cn(
            "font-bold",
            compact ? "text-sm truncate" : "text-lg"
          )}>
            {awayTeam.name}
          </h2>
        </div>
      </div>
    </div>
  )
}
