'use client'

import { cn } from '@/lib/utils'

interface StatsComparisonProps {
  homeStats: Record<string, any>
  awayStats: Record<string, any>
  homeTeamName: string
  awayTeamName: string
}

const STAT_CONFIG = [
  { key: 'Ball Possession', label: 'Possession', isPercentage: true },
  { key: 'Total Shots', label: 'Total Shots' },
  { key: 'Shots on Goal', label: 'Shots on Target' },
  { key: 'Shots off Goal', label: 'Shots off Target' },
  { key: 'expected_goals', label: 'Expected Goals (xG)', decimal: true },
  { key: 'Corner Kicks', label: 'Corners' },
  { key: 'Offsides', label: 'Offsides' },
  { key: 'Fouls', label: 'Fouls' },
  { key: 'Yellow Cards', label: 'Yellow Cards' },
  { key: 'Red Cards', label: 'Red Cards' },
  { key: 'Passes accurate', label: 'Accurate Passes' },
  { key: 'Total passes', label: 'Total Passes' },
  { key: 'Saves', label: 'Goalkeeper Saves' },
]

export function StatsComparison({
  homeStats,
  awayStats,
  homeTeamName,
  awayTeamName,
}: StatsComparisonProps) {
  const renderStatRow = (config: typeof STAT_CONFIG[0]) => {
    const homeVal = homeStats[config.key] || homeStats[config.key.replace(' ', '')] || 0
    const awayVal = awayStats[config.key] || awayStats[config.key.replace(' ', '')] || 0

    // Parse numeric values
    const homeNum = parseFloat(String(homeVal).replace('%', '')) || 0
    const awayNum = parseFloat(String(awayVal).replace('%', '')) || 0

    // For percentage stats, use raw percentages for width
    const total = config.isPercentage ? 100 : (homeNum + awayNum || 1)
    const homeWidth = config.isPercentage ? homeNum : (homeNum / total) * 100
    const awayWidth = config.isPercentage ? awayNum : (awayNum / total) * 100

    // Determine which side is better
    const homeBetter = homeNum > awayNum
    const awayBetter = awayNum > homeNum
    const equal = homeNum === awayNum

    // Format display value
    const formatValue = (val: any) => {
      if (config.decimal && typeof val === 'number') {
        return val.toFixed(2)
      }
      return String(val)
    }

    return (
      <div key={config.key} className="py-2">
        <div className="flex justify-between items-center text-sm mb-1">
          <span className={cn(
            "font-medium w-16 text-left",
            homeBetter && "text-green-500",
            equal && "text-muted-foreground"
          )}>
            {formatValue(homeVal)}
          </span>
          <span className="text-muted-foreground text-center flex-1">{config.label}</span>
          <span className={cn(
            "font-medium w-16 text-right",
            awayBetter && "text-green-500",
            equal && "text-muted-foreground"
          )}>
            {formatValue(awayVal)}
          </span>
        </div>
        <div className="flex h-2 gap-1">
          <div className="flex-1 bg-muted rounded-l-full overflow-hidden flex justify-end">
            <div
              className={cn(
                "h-full transition-all rounded-l-full",
                homeBetter ? "bg-home" : equal ? "bg-muted-foreground" : "bg-home/50"
              )}
              style={{ width: `${Math.min(homeWidth, 100)}%` }}
            />
          </div>
          <div className="flex-1 bg-muted rounded-r-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all rounded-r-full",
                awayBetter ? "bg-away" : equal ? "bg-muted-foreground" : "bg-away/50"
              )}
              style={{ width: `${Math.min(awayWidth, 100)}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Filter to only show stats that have values
  const availableStats = STAT_CONFIG.filter(config => {
    const homeVal = homeStats[config.key] || homeStats[config.key.replace(' ', '')]
    const awayVal = awayStats[config.key] || awayStats[config.key.replace(' ', '')]
    return homeVal !== undefined || awayVal !== undefined
  })

  if (availableStats.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No match statistics available yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Team headers */}
      <div className="flex justify-between items-center text-sm font-medium pb-2 border-b border-border">
        <span className="text-home">{homeTeamName}</span>
        <span className="text-away">{awayTeamName}</span>
      </div>

      {/* Stats */}
      <div className="divide-y divide-border/50">
        {availableStats.map(renderStatRow)}
      </div>
    </div>
  )
}
