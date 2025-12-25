'use client'

import { useState } from 'react'
import { ChevronDown, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Factor definitions with weights and labels
const FACTOR_DEFINITIONS = {
  A_base_strength: { label: 'Base Strength', weight: 18, description: 'xG balance, home advantage, defense & offense' },
  B_form: { label: 'Form', weight: 16, description: 'Recent results, xG trends, opponent quality' },
  C_squad: { label: 'Squad', weight: 14, description: 'Injuries, returns, XI cohesion, rotation' },
  D_load: { label: 'Load & Calendar', weight: 10, description: 'Rest days, congestion, travel' },
  E_tactical: { label: 'Tactical', weight: 12, description: 'Press vs build-up, high line, transitions' },
  F_motivation: { label: 'Motivation', weight: 10, description: 'Table stakes, derby, context' },
  G_referee: { label: 'Referee', weight: 5, description: 'Card & penalty tendencies' },
  H_stadium_weather: { label: 'Stadium & Weather', weight: 8, description: 'Pitch, attendance, conditions' },
  I_h2h: { label: 'Head-to-Head', weight: 7, description: 'Historical results & patterns' },
} as const

type FactorKey = keyof typeof FACTOR_DEFINITIONS

interface FactorData {
  score: number
  weighted: number
  notes?: string
}

interface FactorsObject {
  A_base_strength?: FactorData
  B_form?: FactorData
  C_squad?: FactorData
  D_load?: FactorData
  E_tactical?: FactorData
  F_motivation?: FactorData
  G_referee?: FactorData
  H_stadium_weather?: FactorData
  I_h2h?: FactorData
  // Legacy fields
  home_win_pct?: number
  draw_pct?: number
  away_win_pct?: number
  over_under?: string
  btts?: string
  value_bet?: string
}

interface FactorBreakdownProps {
  factors: FactorsObject
  overallIndex?: number
  compact?: boolean // For table view
}

export function FactorBreakdown({ factors, overallIndex, compact = false }: FactorBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Check if we have A-I factor breakdown
  const hasFactorBreakdown = Object.keys(FACTOR_DEFINITIONS).some(
    key => factors[key as FactorKey] !== undefined
  )

  if (!hasFactorBreakdown) {
    return null // Don't render if no factor breakdown available
  }

  // Get score color based on how much it favors home (>50) vs away (<50)
  const getScoreColor = (score: number) => {
    if (score >= 65) return 'text-green-500'
    if (score >= 55) return 'text-green-400'
    if (score >= 45) return 'text-muted-foreground'
    if (score >= 35) return 'text-orange-400'
    return 'text-red-500'
  }

  // Get bar color based on score
  const getBarColor = (score: number) => {
    if (score >= 60) return 'bg-green-500'
    if (score >= 55) return 'bg-green-400'
    if (score >= 45) return 'bg-muted-foreground'
    if (score >= 40) return 'bg-orange-400'
    return 'bg-red-500'
  }

  // Render factor row
  const renderFactor = (key: FactorKey, index: number) => {
    const factorData = factors[key]
    if (!factorData) return null

    const def = FACTOR_DEFINITIONS[key]
    const letter = key.charAt(0)

    return (
      <div key={key} className={cn("py-2", index > 0 && "border-t border-border/50")}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
              {letter}
            </span>
            <span className="text-sm font-medium">{def.label}</span>
            <span className="text-xs text-muted-foreground">({def.weight}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold", getScoreColor(factorData.score))}>
              {factorData.score}
            </span>
            <span className="text-xs text-muted-foreground">
              +{factorData.weighted.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all", getBarColor(factorData.score))}
            style={{ width: `${factorData.score}%` }}
          />
        </div>

        {/* Notes (if available and not compact) */}
        {!compact && factorData.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {factorData.notes}
          </p>
        )}
      </div>
    )
  }

  // Calculate overall from factors if not provided
  const calculatedOverall = overallIndex || Object.keys(FACTOR_DEFINITIONS).reduce((sum, key) => {
    const factorData = factors[key as FactorKey]
    return sum + (factorData?.weighted || 0)
  }, 0)

  // Determine prediction from overall index
  const getPredictionFromIndex = (index: number) => {
    if (index >= 60) return { result: '1', label: 'Home Win' }
    if (index >= 55) return { result: '1X', label: 'Home or Draw' }
    if (index >= 45) return { result: 'X', label: 'Draw likely' }
    if (index >= 40) return { result: 'X2', label: 'Draw or Away' }
    return { result: '2', label: 'Away Win' }
  }

  const predictionInfo = getPredictionFromIndex(calculatedOverall)

  // Compact view for table
  if (compact) {
    return (
      <div className="space-y-2">
        {(Object.keys(FACTOR_DEFINITIONS) as FactorKey[]).map((key, idx) =>
          renderFactor(key, idx)
        )}
      </div>
    )
  }

  // Full collapsible view
  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
      >
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium">Factor Analysis</span>
        <span className={cn(
          "text-xs font-bold px-2 py-0.5 rounded",
          calculatedOverall >= 55 ? "bg-green-500/20 text-green-500" :
          calculatedOverall >= 45 ? "bg-muted text-muted-foreground" :
          "bg-red-500/20 text-red-500"
        )}>
          {Math.round(calculatedOverall)} pts
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          {predictionInfo.label}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 ml-auto text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-1">
          {(Object.keys(FACTOR_DEFINITIONS) as FactorKey[]).map((key, idx) =>
            renderFactor(key, idx)
          )}

          {/* Overall summary */}
          <div className="pt-3 mt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Overall Index</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-bold",
                  calculatedOverall >= 55 ? "text-green-500" :
                  calculatedOverall >= 45 ? "text-muted-foreground" :
                  "text-red-500"
                )}>
                  {Math.round(calculatedOverall)}
                </span>
                <span className={cn(
                  "text-xs px-2 py-1 rounded font-medium",
                  predictionInfo.result === '1' && "bg-home/20 text-home",
                  predictionInfo.result === '1X' && "bg-home/10 text-home",
                  predictionInfo.result === 'X' && "bg-draw/20 text-draw",
                  predictionInfo.result === 'X2' && "bg-away/10 text-away",
                  predictionInfo.result === '2' && "bg-away/20 text-away"
                )}>
                  {predictionInfo.result}
                </span>
              </div>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mt-2">
              <div
                className={cn(
                  "h-full transition-all",
                  calculatedOverall >= 55 ? "bg-green-500" :
                  calculatedOverall >= 45 ? "bg-muted-foreground" :
                  "bg-red-500"
                )}
                style={{ width: `${calculatedOverall}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Away favored</span>
              <span>Neutral</span>
              <span>Home favored</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
