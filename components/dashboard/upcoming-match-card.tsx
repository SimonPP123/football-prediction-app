'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { MiniFactorDisplay } from '@/components/stats/mini-factor-display'
import { ConfidenceBreakdown } from '@/components/stats/confidence-breakdown'
import { WeatherBadge } from '@/components/stats/weather-badge'

interface UpcomingMatchCardProps {
  fixture: {
    id: string
    match_date: string
    round?: string
    home_team?: { id: string; name: string; logo?: string; code?: string }
    away_team?: { id: string; name: string; logo?: string; code?: string }
    venue?: { name: string }
    prediction?: Array<{
      prediction_result?: string
      confidence_pct?: number
      overall_index?: number
      home_win_pct?: number
      draw_pct?: number
      away_win_pct?: number
      factors?: {
        breakdown?: Array<{
          factor: string
          label: string
          score: number
          weight: number
          contribution?: number
        }>
      }
    }>
    weather?: Array<{
      temperature?: number
      condition?: string
      wind_speed?: number
    }>
    odds?: Array<{
      bookmaker?: string
      home_win?: number
      draw?: number
      away_win?: number
    }>
  }
  showFactors?: boolean
  className?: string
}

const FACTOR_LABELS: Record<string, string> = {
  A: 'Base Strength',
  B: 'Form',
  C: 'Key Players',
  D: 'Tactical',
  E: 'Table Position',
  F: 'Head-to-Head',
}

export function UpcomingMatchCard({
  fixture,
  showFactors = true,
  className,
}: UpcomingMatchCardProps) {
  // Handle Supabase returning single object vs array for nested relations
  const rawPrediction = fixture.prediction
  const prediction = rawPrediction
    ? (Array.isArray(rawPrediction) ? rawPrediction[0] : rawPrediction)
    : undefined
  const rawWeather = fixture.weather
  const weather = rawWeather
    ? (Array.isArray(rawWeather) ? rawWeather[0] : rawWeather)
    : undefined
  const rawOdds = fixture.odds
  const odds = rawOdds
    ? (Array.isArray(rawOdds) ? rawOdds[0] : rawOdds)
    : undefined

  // Extract factor breakdown
  const factors = prediction?.factors?.breakdown?.map(f => ({
    factor: f.factor,
    label: FACTOR_LABELS[f.factor] || f.label,
    score: f.score,
    weight: f.weight,
    contribution: f.contribution,
  })) || []

  const matchDate = new Date(fixture.match_date)
  const isToday = new Date().toDateString() === matchDate.toDateString()
  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === matchDate.toDateString()

  return (
    <Link
      href={`/matches/${fixture.id}`}
      className={cn(
        'block bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors',
        className
      )}
    >
      {/* Header: Date & Round */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded',
              isToday
                ? 'bg-green-500/10 text-green-600'
                : isTomorrow
                ? 'bg-amber-500/10 text-amber-600'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isToday
              ? 'TODAY'
              : isTomorrow
              ? 'TOMORROW'
              : matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span className="text-xs text-muted-foreground">
            {matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {weather && (
          <WeatherBadge
            weather={{
              temperature: weather.temperature,
              condition: weather.condition,
              windSpeed: weather.wind_speed,
            }}
            variant="inline"
          />
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4 mb-3">
        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-medium text-right text-sm">
            {fixture.home_team?.code || fixture.home_team?.name?.slice(0, 3) || 'TBD'}
          </span>
          {fixture.home_team?.logo && (
            <img
              src={fixture.home_team.logo}
              alt={fixture.home_team.name}
              className="w-8 h-8 object-contain"
            />
          )}
        </div>

        {/* Prediction Badge */}
        <div className="text-center shrink-0">
          {prediction ? (
            <div className="space-y-1">
              <div
                className={cn(
                  'px-3 py-1 rounded text-sm font-bold',
                  prediction.prediction_result === '1'
                    ? 'bg-green-500/10 text-green-600'
                    : prediction.prediction_result === 'X'
                    ? 'bg-amber-500/10 text-amber-600'
                    : prediction.prediction_result === '2'
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-muted'
                )}
              >
                {prediction.prediction_result || 'vs'}
              </div>
              {prediction.confidence_pct && (
                <p className="text-[10px] text-muted-foreground">
                  {prediction.confidence_pct}% conf
                </p>
              )}
            </div>
          ) : (
            <div className="px-3 py-1 bg-muted rounded text-sm">vs</div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-2 flex-1">
          {fixture.away_team?.logo && (
            <img
              src={fixture.away_team.logo}
              alt={fixture.away_team.name}
              className="w-8 h-8 object-contain"
            />
          )}
          <span className="font-medium text-sm">
            {fixture.away_team?.code || fixture.away_team?.name?.slice(0, 3) || 'TBD'}
          </span>
        </div>
      </div>

      {/* Prediction Details */}
      {prediction && (
        <div className="space-y-3 pt-3 border-t">
          {/* Outcome Probabilities */}
          {prediction.home_win_pct && prediction.draw_pct && prediction.away_win_pct && (
            <ConfidenceBreakdown
              homeWin={prediction.home_win_pct}
              draw={prediction.draw_pct}
              awayWin={prediction.away_win_pct}
              variant="stacked"
              showLabels={false}
            />
          )}

          {/* Factor Breakdown */}
          {showFactors && factors.length > 0 && (
            <MiniFactorDisplay
              factors={factors}
              variant="grid"
              showContributions={false}
            />
          )}

          {/* Odds */}
          {odds && odds.home_win && (
            <div className="flex items-center justify-between text-xs pt-2 border-t">
              <span className="text-muted-foreground">Best Odds</span>
              <div className="flex gap-3">
                <span className="text-green-600">{odds.home_win.toFixed(2)}</span>
                <span className="text-amber-600">{odds.draw?.toFixed(2)}</span>
                <span className="text-red-600">{odds.away_win?.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Round */}
      {fixture.round && (
        <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t">
          {fixture.round}
        </p>
      )}
    </Link>
  )
}
