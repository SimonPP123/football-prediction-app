'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Odds {
  bookmaker?: string
  home_win?: number
  draw?: number
  away_win?: number
  over_2_5?: number
  under_2_5?: number
  btts_yes?: number
  btts_no?: number
  updated_at?: string
}

interface OddsSectionProps {
  odds: Odds[]
  homeTeamName: string
  awayTeamName: string
}

// Calculate implied probability from decimal odds
function impliedProbability(odds: number): number {
  return odds > 0 ? (1 / odds) * 100 : 0
}

// Find the best odds for each market
function findBestOdds(odds: Odds[], market: keyof Odds): { value: number; bookmaker: string } | null {
  let best: { value: number; bookmaker: string } | null = null

  for (const o of odds) {
    const val = o[market] as number | undefined
    if (val && (!best || val > best.value)) {
      best = { value: val, bookmaker: o.bookmaker || 'Unknown' }
    }
  }

  return best
}

export function OddsSection({ odds, homeTeamName, awayTeamName }: OddsSectionProps) {
  if (!odds || odds.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No odds available for this match
      </div>
    )
  }

  const bestHome = findBestOdds(odds, 'home_win')
  const bestDraw = findBestOdds(odds, 'draw')
  const bestAway = findBestOdds(odds, 'away_win')
  const bestOver = findBestOdds(odds, 'over_2_5')
  const bestUnder = findBestOdds(odds, 'under_2_5')
  const bestBttsYes = findBestOdds(odds, 'btts_yes')
  const bestBttsNo = findBestOdds(odds, 'btts_no')

  return (
    <div className="space-y-6">
      {/* 1X2 Market */}
      <div>
        <h4 className="text-sm font-medium mb-3">Match Result (1X2)</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{homeTeamName}</p>
            <p className="text-2xl font-bold">{bestHome?.value.toFixed(2) || '-'}</p>
            {bestHome && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {bestHome.bookmaker} • {impliedProbability(bestHome.value).toFixed(0)}%
              </p>
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Draw</p>
            <p className="text-2xl font-bold">{bestDraw?.value.toFixed(2) || '-'}</p>
            {bestDraw && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {bestDraw.bookmaker} • {impliedProbability(bestDraw.value).toFixed(0)}%
              </p>
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">{awayTeamName}</p>
            <p className="text-2xl font-bold">{bestAway?.value.toFixed(2) || '-'}</p>
            {bestAway && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {bestAway.bookmaker} • {impliedProbability(bestAway.value).toFixed(0)}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Over/Under 2.5 */}
      {(bestOver || bestUnder) && (
        <div>
          <h4 className="text-sm font-medium mb-3">Goals Over/Under 2.5</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Over 2.5</p>
              <p className="text-xl font-bold">{bestOver?.value.toFixed(2) || '-'}</p>
              {bestOver && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {bestOver.bookmaker}
                </p>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Under 2.5</p>
              <p className="text-xl font-bold">{bestUnder?.value.toFixed(2) || '-'}</p>
              {bestUnder && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {bestUnder.bookmaker}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BTTS */}
      {(bestBttsYes || bestBttsNo) && (
        <div>
          <h4 className="text-sm font-medium mb-3">Both Teams to Score</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Yes</p>
              <p className="text-xl font-bold">{bestBttsYes?.value.toFixed(2) || '-'}</p>
              {bestBttsYes && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {bestBttsYes.bookmaker}
                </p>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">No</p>
              <p className="text-xl font-bold">{bestBttsNo?.value.toFixed(2) || '-'}</p>
              {bestBttsNo && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {bestBttsNo.bookmaker}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bookmaker comparison table */}
      {odds.length > 1 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Odds Comparison</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">Bookmaker</th>
                  <th className="text-center p-2">1</th>
                  <th className="text-center p-2">X</th>
                  <th className="text-center p-2">2</th>
                </tr>
              </thead>
              <tbody>
                {odds.map((o, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-2">{o.bookmaker || 'Unknown'}</td>
                    <td className={cn(
                      "p-2 text-center font-medium",
                      bestHome && o.home_win === bestHome.value && "text-green-500"
                    )}>
                      {o.home_win?.toFixed(2) || '-'}
                    </td>
                    <td className={cn(
                      "p-2 text-center font-medium",
                      bestDraw && o.draw === bestDraw.value && "text-green-500"
                    )}>
                      {o.draw?.toFixed(2) || '-'}
                    </td>
                    <td className={cn(
                      "p-2 text-center font-medium",
                      bestAway && o.away_win === bestAway.value && "text-green-500"
                    )}>
                      {o.away_win?.toFixed(2) || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Best odds highlighted in green
          </p>
        </div>
      )}
    </div>
  )
}
