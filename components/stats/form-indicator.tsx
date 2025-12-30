'use client'

import { cn } from '@/lib/utils'

type FormResult = 'W' | 'D' | 'L' | 'w' | 'd' | 'l'

interface FormIndicatorProps {
  form: string | FormResult[]
  size?: 'xs' | 'sm' | 'md'
  showLabels?: boolean
  maxResults?: number
  className?: string
}

const resultColors: Record<string, { bg: string; text: string }> = {
  W: { bg: 'bg-green-500', text: 'text-white' },
  w: { bg: 'bg-green-500', text: 'text-white' },
  D: { bg: 'bg-amber-500', text: 'text-white' },
  d: { bg: 'bg-amber-500', text: 'text-white' },
  L: { bg: 'bg-red-500', text: 'text-white' },
  l: { bg: 'bg-red-500', text: 'text-white' },
}

const sizeClasses = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-6 h-6 text-xs',
}

export function FormIndicator({
  form,
  size = 'sm',
  showLabels = true,
  maxResults = 5,
  className,
}: FormIndicatorProps) {
  // Convert string to array
  const results: FormResult[] = typeof form === 'string'
    ? (form.toUpperCase().split('') as FormResult[])
    : form.map(r => r.toUpperCase() as FormResult)

  // Take only the last N results
  const displayResults = results.slice(-maxResults)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {displayResults.map((result, index) => {
        const colors = resultColors[result] || resultColors.D
        const displayChar = result.toUpperCase()

        return (
          <div
            key={index}
            className={cn(
              'rounded flex items-center justify-center font-bold',
              sizeClasses[size],
              colors.bg,
              colors.text
            )}
            title={
              displayChar === 'W' ? 'Win' : displayChar === 'D' ? 'Draw' : 'Loss'
            }
          >
            {showLabels ? displayChar : ''}
          </div>
        )
      })}
    </div>
  )
}

interface FormSummaryProps {
  form: string | FormResult[]
  showPercentages?: boolean
  className?: string
}

export function FormSummary({ form, showPercentages = true, className }: FormSummaryProps) {
  const results = typeof form === 'string'
    ? form.toUpperCase().split('')
    : form.map(r => r.toUpperCase())

  const wins = results.filter((r) => r === 'W').length
  const draws = results.filter((r) => r === 'D').length
  const losses = results.filter((r) => r === 'L').length
  const total = results.length

  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0
  const drawPct = total > 0 ? Math.round((draws / total) * 100) : 0
  const lossPct = total > 0 ? Math.round((losses / total) * 100) : 0

  return (
    <div className={cn('flex items-center gap-3 text-xs', className)}>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span>
          {wins}W{showPercentages && <span className="text-muted-foreground ml-1">({winPct}%)</span>}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span>
          {draws}D{showPercentages && <span className="text-muted-foreground ml-1">({drawPct}%)</span>}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span>
          {losses}L{showPercentages && <span className="text-muted-foreground ml-1">({lossPct}%)</span>}
        </span>
      </div>
    </div>
  )
}
