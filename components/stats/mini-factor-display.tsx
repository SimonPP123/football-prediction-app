'use client'

import { cn } from '@/lib/utils'

interface Factor {
  factor: string
  label: string
  score: number
  weight: number
  contribution?: number
  reasoning?: string
}

interface MiniFactorDisplayProps {
  factors: Factor[]
  variant?: 'horizontal' | 'vertical' | 'grid'
  showContributions?: boolean
  className?: string
}

const FACTOR_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  A: { bg: 'bg-green-500/10', text: 'text-green-600', bar: 'bg-green-500' },
  B: { bg: 'bg-blue-500/10', text: 'text-blue-600', bar: 'bg-blue-500' },
  C: { bg: 'bg-amber-500/10', text: 'text-amber-600', bar: 'bg-amber-500' },
  D: { bg: 'bg-purple-500/10', text: 'text-purple-600', bar: 'bg-purple-500' },
  E: { bg: 'bg-red-500/10', text: 'text-red-600', bar: 'bg-red-500' },
  F: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', bar: 'bg-cyan-500' },
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function FactorBar({ factor, compact = false }: { factor: Factor; compact?: boolean }) {
  const colors = FACTOR_COLORS[factor.factor] || FACTOR_COLORS.A

  return (
    <div className={cn('flex items-center gap-2', compact ? 'min-w-0' : '')}>
      <span
        className={cn(
          'shrink-0 font-bold text-xs w-5 h-5 flex items-center justify-center rounded',
          colors.bg,
          colors.text
        )}
      >
        {factor.factor}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-[10px] text-muted-foreground truncate">
            {factor.label}
          </span>
          <span className={cn('text-[10px] font-medium', getScoreColor(factor.score))}>
            {factor.score}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', colors.bar)}
            style={{ width: `${factor.score}%` }}
          />
        </div>
      </div>
      {factor.contribution !== undefined && (
        <span
          className={cn(
            'text-[10px] font-medium shrink-0 w-10 text-right',
            factor.contribution > 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {factor.contribution > 0 ? '+' : ''}
          {factor.contribution.toFixed(1)}
        </span>
      )}
    </div>
  )
}

function CompactFactorPill({ factor }: { factor: Factor }) {
  const colors = FACTOR_COLORS[factor.factor] || FACTOR_COLORS.A

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
        colors.bg
      )}
      title={`${factor.label}: ${factor.score}/100`}
    >
      <span className={cn('font-bold', colors.text)}>{factor.factor}</span>
      <span className={getScoreColor(factor.score)}>{factor.score}</span>
    </div>
  )
}

export function MiniFactorDisplay({
  factors,
  variant = 'vertical',
  showContributions = true,
  className,
}: MiniFactorDisplayProps) {
  // Sort factors by letter
  const sortedFactors = [...factors].sort((a, b) => a.factor.localeCompare(b.factor))

  if (variant === 'horizontal') {
    return (
      <div className={cn('flex flex-wrap gap-1', className)}>
        {sortedFactors.map((factor) => (
          <CompactFactorPill key={factor.factor} factor={factor} />
        ))}
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 gap-2', className)}>
        {sortedFactors.map((factor) => (
          <FactorBar
            key={factor.factor}
            factor={showContributions ? factor : { ...factor, contribution: undefined }}
            compact
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {sortedFactors.map((factor) => (
        <FactorBar
          key={factor.factor}
          factor={showContributions ? factor : { ...factor, contribution: undefined }}
        />
      ))}
    </div>
  )
}
