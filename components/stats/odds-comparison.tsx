'use client'

import { cn } from '@/lib/utils'

interface BookmakerOdds {
  bookmaker: string
  homeWin: number
  draw: number
  awayWin: number
  updatedAt?: string
}

interface OddsComparisonProps {
  odds: BookmakerOdds[]
  highlightBest?: boolean
  variant?: 'table' | 'cards' | 'compact'
  className?: string
}

function getBestOdds(odds: BookmakerOdds[]) {
  if (odds.length === 0) return { homeWin: 0, draw: 0, awayWin: 0 }

  return {
    homeWin: Math.max(...odds.map((o) => o.homeWin)),
    draw: Math.max(...odds.map((o) => o.draw)),
    awayWin: Math.max(...odds.map((o) => o.awayWin)),
  }
}

function formatOdds(value: number): string {
  return value.toFixed(2)
}

export function OddsComparison({
  odds,
  highlightBest = true,
  variant = 'table',
  className,
}: OddsComparisonProps) {
  const best = highlightBest ? getBestOdds(odds) : null

  if (odds.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground text-center py-4', className)}>
        No odds available
      </div>
    )
  }

  if (variant === 'compact') {
    // Show just the best odds
    const bestOdds = getBestOdds(odds)
    return (
      <div className={cn('flex items-center gap-4 text-sm', className)}>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">1</p>
          <p className="font-bold text-green-600">{formatOdds(bestOdds.homeWin)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">X</p>
          <p className="font-bold text-amber-600">{formatOdds(bestOdds.draw)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">2</p>
          <p className="font-bold text-red-600">{formatOdds(bestOdds.awayWin)}</p>
        </div>
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2', className)}>
        {odds.map((bookmaker) => (
          <div
            key={bookmaker.bookmaker}
            className="bg-card border rounded-lg p-3 space-y-2"
          >
            <p className="text-xs font-medium text-muted-foreground truncate">
              {bookmaker.bookmaker}
            </p>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-[10px] text-muted-foreground">1</p>
                <p
                  className={cn(
                    'font-bold',
                    best && bookmaker.homeWin === best.homeWin
                      ? 'text-green-600'
                      : ''
                  )}
                >
                  {formatOdds(bookmaker.homeWin)}
                </p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] text-muted-foreground">X</p>
                <p
                  className={cn(
                    'font-bold',
                    best && bookmaker.draw === best.draw ? 'text-amber-600' : ''
                  )}
                >
                  {formatOdds(bookmaker.draw)}
                </p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] text-muted-foreground">2</p>
                <p
                  className={cn(
                    'font-bold',
                    best && bookmaker.awayWin === best.awayWin ? 'text-red-600' : ''
                  )}
                >
                  {formatOdds(bookmaker.awayWin)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Default: table variant
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">
              Bookmaker
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">
              1
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">
              X
            </th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">
              2
            </th>
          </tr>
        </thead>
        <tbody>
          {odds.map((bookmaker) => (
            <tr key={bookmaker.bookmaker} className="border-b last:border-0">
              <td className="py-2 px-2 font-medium truncate max-w-[120px]">
                {bookmaker.bookmaker}
              </td>
              <td
                className={cn(
                  'py-2 px-2 text-center font-bold',
                  best && bookmaker.homeWin === best.homeWin
                    ? 'text-green-600 bg-green-500/10'
                    : ''
                )}
              >
                {formatOdds(bookmaker.homeWin)}
              </td>
              <td
                className={cn(
                  'py-2 px-2 text-center font-bold',
                  best && bookmaker.draw === best.draw
                    ? 'text-amber-600 bg-amber-500/10'
                    : ''
                )}
              >
                {formatOdds(bookmaker.draw)}
              </td>
              <td
                className={cn(
                  'py-2 px-2 text-center font-bold',
                  best && bookmaker.awayWin === best.awayWin
                    ? 'text-red-600 bg-red-500/10'
                    : ''
                )}
              >
                {formatOdds(bookmaker.awayWin)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface SingleOddsProps {
  homeWin: number
  draw: number
  awayWin: number
  bookmaker?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SingleOdds({
  homeWin,
  draw,
  awayWin,
  bookmaker,
  size = 'md',
  className,
}: SingleOddsProps) {
  const sizeClasses = {
    sm: 'text-xs gap-2',
    md: 'text-sm gap-3',
    lg: 'text-base gap-4',
  }

  const valueSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  }

  return (
    <div className={cn('space-y-1', className)}>
      {bookmaker && (
        <p className="text-[10px] text-muted-foreground">{bookmaker}</p>
      )}
      <div className={cn('flex items-center justify-center', sizeClasses[size])}>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">1</p>
          <p className={cn('font-bold text-green-600', valueSizes[size])}>
            {formatOdds(homeWin)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">X</p>
          <p className={cn('font-bold text-amber-600', valueSizes[size])}>
            {formatOdds(draw)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">2</p>
          <p className={cn('font-bold text-red-600', valueSizes[size])}>
            {formatOdds(awayWin)}
          </p>
        </div>
      </div>
    </div>
  )
}
