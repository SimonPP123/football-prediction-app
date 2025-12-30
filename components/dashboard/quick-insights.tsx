'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, Target, Award, AlertTriangle, Zap } from 'lucide-react'
import Link from 'next/link'

interface QuickInsightsProps {
  bestFactor?: {
    factor: string
    accuracy: number
    total: number
  } | null
  resultAccuracy?: number
  totalAnalyzed?: number
  className?: string
}

const FACTOR_NAMES: Record<string, string> = {
  A: 'Base Strength',
  B: 'Form Analysis',
  C: 'Key Players',
  D: 'Tactical Matchup',
  E: 'Table Position',
  F: 'Head-to-Head',
}

export function QuickInsights({
  bestFactor,
  resultAccuracy = 0,
  totalAnalyzed = 0,
  className,
}: QuickInsightsProps) {
  const insights = [
    {
      icon: TrendingUp,
      label: 'Result Accuracy',
      value: resultAccuracy > 0 ? `${resultAccuracy.toFixed(1)}%` : 'N/A',
      description: totalAnalyzed > 0 ? `Based on ${totalAnalyzed} analyzed matches` : 'No data yet',
      color: resultAccuracy >= 60 ? 'text-green-600' : resultAccuracy >= 40 ? 'text-amber-600' : 'text-muted-foreground',
    },
    {
      icon: Award,
      label: 'Best Performing Factor',
      value: bestFactor ? FACTOR_NAMES[bestFactor.factor] || `Factor ${bestFactor.factor}` : 'N/A',
      description: bestFactor
        ? `${bestFactor.accuracy.toFixed(1)}% accuracy (${bestFactor.total} matches)`
        : 'Insufficient data',
      color: bestFactor ? 'text-blue-600' : 'text-muted-foreground',
    },
    {
      icon: Target,
      label: 'Model Status',
      value: totalAnalyzed >= 20 ? 'Active' : 'Learning',
      description: totalAnalyzed >= 20
        ? 'Model has sufficient data'
        : `Need ${20 - totalAnalyzed} more matches`,
      color: totalAnalyzed >= 20 ? 'text-green-600' : 'text-amber-600',
    },
  ]

  return (
    <div className={cn('bg-card border rounded-lg', className)}>
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold">Quick Insights</h2>
        </div>
        <Link href="/stats" className="text-sm text-primary hover:underline">
          View Stats
        </Link>
      </div>
      <div className="p-4 grid gap-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon
          return (
            <div key={index} className="flex items-start gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', insight.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{insight.label}</p>
                <p className={cn('font-semibold', insight.color)}>{insight.value}</p>
                <p className="text-xs text-muted-foreground truncate">{insight.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
