'use client'

import { cn } from '@/lib/utils'

interface StatRow {
  label: string
  homeValue: number | string
  awayValue: number | string
  type?: 'number' | 'percentage' | 'decimal'
  higherIsBetter?: boolean
}

interface TeamStatComparisonProps {
  homeTeam: string
  awayTeam: string
  stats: StatRow[]
  variant?: 'bars' | 'table' | 'compact'
  className?: string
}

function formatValue(value: number | string, type?: string): string {
  if (typeof value === 'string') return value
  if (type === 'percentage') return `${value}%`
  if (type === 'decimal') return value.toFixed(2)
  return String(value)
}

function getBarWidth(value: number | string, otherValue: number | string): number {
  const v = typeof value === 'number' ? value : parseFloat(value) || 0
  const o = typeof otherValue === 'number' ? otherValue : parseFloat(otherValue) || 0
  const total = v + o
  if (total === 0) return 50
  return (v / total) * 100
}

function ComparisonBar({ stat }: { stat: StatRow }) {
  const homeWidth = getBarWidth(stat.homeValue, stat.awayValue)
  const awayWidth = 100 - homeWidth

  const homeNum = typeof stat.homeValue === 'number' ? stat.homeValue : parseFloat(stat.homeValue) || 0
  const awayNum = typeof stat.awayValue === 'number' ? stat.awayValue : parseFloat(stat.awayValue) || 0

  let homeColor = 'bg-green-500'
  let awayColor = 'bg-red-500'

  if (stat.higherIsBetter !== undefined) {
    if (stat.higherIsBetter) {
      homeColor = homeNum >= awayNum ? 'bg-green-500' : 'bg-red-500'
      awayColor = awayNum >= homeNum ? 'bg-green-500' : 'bg-red-500'
    } else {
      homeColor = homeNum <= awayNum ? 'bg-green-500' : 'bg-red-500'
      awayColor = awayNum <= homeNum ? 'bg-green-500' : 'bg-red-500'
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{formatValue(stat.homeValue, stat.type)}</span>
        <span className="text-muted-foreground">{stat.label}</span>
        <span className="font-medium">{formatValue(stat.awayValue, stat.type)}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        <div
          className={cn('transition-all', homeColor)}
          style={{ width: `${homeWidth}%` }}
        />
        <div
          className={cn('transition-all', awayColor)}
          style={{ width: `${awayWidth}%` }}
        />
      </div>
    </div>
  )
}

export function TeamStatComparison({
  homeTeam,
  awayTeam,
  stats,
  variant = 'bars',
  className,
}: TeamStatComparisonProps) {
  if (stats.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground text-center py-4', className)}>
        No statistics available
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between text-xs font-medium mb-2">
          <span>{homeTeam}</span>
          <span>{awayTeam}</span>
        </div>
        {stats.slice(0, 4).map((stat, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="font-medium">{formatValue(stat.homeValue, stat.type)}</span>
            <span className="text-muted-foreground text-[10px]">{stat.label}</span>
            <span className="font-medium">{formatValue(stat.awayValue, stat.type)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className={cn('overflow-x-auto', className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-medium">{homeTeam}</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">
                Stat
              </th>
              <th className="text-right py-2 px-2 font-medium">{awayTeam}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, index) => {
              const homeNum = typeof stat.homeValue === 'number' ? stat.homeValue : parseFloat(stat.homeValue) || 0
              const awayNum = typeof stat.awayValue === 'number' ? stat.awayValue : parseFloat(stat.awayValue) || 0

              let homeClass = ''
              let awayClass = ''

              if (stat.higherIsBetter !== undefined) {
                if (stat.higherIsBetter) {
                  homeClass = homeNum >= awayNum ? 'text-green-600 font-bold' : ''
                  awayClass = awayNum >= homeNum ? 'text-green-600 font-bold' : ''
                } else {
                  homeClass = homeNum <= awayNum ? 'text-green-600 font-bold' : ''
                  awayClass = awayNum <= homeNum ? 'text-green-600 font-bold' : ''
                }
              }

              return (
                <tr key={index} className="border-b last:border-0">
                  <td className={cn('py-2 px-2', homeClass)}>
                    {formatValue(stat.homeValue, stat.type)}
                  </td>
                  <td className="py-2 px-2 text-center text-muted-foreground">
                    {stat.label}
                  </td>
                  <td className={cn('py-2 px-2 text-right', awayClass)}>
                    {formatValue(stat.awayValue, stat.type)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Default: bars variant
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{homeTeam}</span>
        <span>{awayTeam}</span>
      </div>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <ComparisonBar key={index} stat={stat} />
        ))}
      </div>
    </div>
  )
}
