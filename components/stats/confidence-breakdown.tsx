'use client'

import { cn } from '@/lib/utils'

interface ConfidenceBreakdownProps {
  homeWin: number
  draw: number
  awayWin: number
  variant?: 'bars' | 'stacked' | 'compact'
  showLabels?: boolean
  showPercentages?: boolean
  homeLabel?: string
  awayLabel?: string
  className?: string
}

export function ConfidenceBreakdown({
  homeWin,
  draw,
  awayWin,
  variant = 'bars',
  showLabels = true,
  showPercentages = true,
  homeLabel = '1',
  awayLabel = '2',
  className,
}: ConfidenceBreakdownProps) {
  // Normalize to ensure they add up to 100
  const total = homeWin + draw + awayWin
  const normalizedHome = total > 0 ? (homeWin / total) * 100 : 33.33
  const normalizedDraw = total > 0 ? (draw / total) * 100 : 33.33
  const normalizedAway = total > 0 ? (awayWin / total) * 100 : 33.33

  if (variant === 'stacked') {
    return (
      <div className={cn('space-y-1', className)}>
        {showLabels && (
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{homeLabel}</span>
            <span>X</span>
            <span>{awayLabel}</span>
          </div>
        )}
        <div className="h-2 flex rounded-full overflow-hidden">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${normalizedHome}%` }}
            title={`Home: ${homeWin}%`}
          />
          <div
            className="bg-amber-500 transition-all"
            style={{ width: `${normalizedDraw}%` }}
            title={`Draw: ${draw}%`}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${normalizedAway}%` }}
            title={`Away: ${awayWin}%`}
          />
        </div>
        {showPercentages && (
          <div className="flex justify-between text-[10px] font-medium">
            <span className="text-green-600">{homeWin}%</span>
            <span className="text-amber-600">{draw}%</span>
            <span className="text-red-600">{awayWin}%</span>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-xs', className)}>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-medium">{homeWin}%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="font-medium">{draw}%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="font-medium">{awayWin}%</span>
        </div>
      </div>
    )
  }

  // Default: bars variant
  return (
    <div className={cn('space-y-2', className)}>
      {/* Home Win */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{showLabels ? homeLabel : '1'}</span>
          {showPercentages && <span className="font-medium text-green-600">{homeWin}%</span>}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${homeWin}%` }}
          />
        </div>
      </div>

      {/* Draw */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">X</span>
          {showPercentages && <span className="font-medium text-amber-600">{draw}%</span>}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${draw}%` }}
          />
        </div>
      </div>

      {/* Away Win */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{showLabels ? awayLabel : '2'}</span>
          {showPercentages && <span className="font-medium text-red-600">{awayWin}%</span>}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all"
            style={{ width: `${awayWin}%` }}
          />
        </div>
      </div>
    </div>
  )
}
