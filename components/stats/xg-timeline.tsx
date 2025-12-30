'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

interface XGDataPoint {
  minute: number
  homeXG: number
  awayXG: number
  event?: string
}

interface XGTimelineProps {
  data: XGDataPoint[]
  homeTeam: string
  awayTeam: string
  finalHomeXG?: number
  finalAwayXG?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-40',
  md: 'h-56',
  lg: 'h-72',
}

export function XGTimeline({
  data,
  homeTeam,
  awayTeam,
  finalHomeXG,
  finalAwayXG,
  size = 'md',
  className,
}: XGTimelineProps) {
  return (
    <div className={cn('w-full', sizeClasses[size], className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="minute"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(value) => `${value}'`}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            domain={[0, 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              value.toFixed(2),
              name === 'homeXG' ? homeTeam : awayTeam,
            ]}
            labelFormatter={(label) => `${label}'`}
          />
          <Legend
            formatter={(value) => (value === 'homeXG' ? homeTeam : awayTeam)}
            wrapperStyle={{ fontSize: '11px' }}
          />
          <Line
            type="monotone"
            dataKey="homeXG"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name="homeXG"
          />
          <Line
            type="monotone"
            dataKey="awayXG"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="awayXG"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface XGComparisonProps {
  homeXG: number
  awayXG: number
  homeGoals?: number
  awayGoals?: number
  homeTeam?: string
  awayTeam?: string
  className?: string
}

export function XGComparison({
  homeXG,
  awayXG,
  homeGoals,
  awayGoals,
  homeTeam = 'Home',
  awayTeam = 'Away',
  className,
}: XGComparisonProps) {
  const totalXG = homeXG + awayXG
  const homePercent = totalXG > 0 ? (homeXG / totalXG) * 100 : 50
  const awayPercent = totalXG > 0 ? (awayXG / totalXG) * 100 : 50

  const homeDiff = homeGoals !== undefined ? homeGoals - homeXG : null
  const awayDiff = awayGoals !== undefined ? awayGoals - awayXG : null

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <div className="text-left">
          <p className="font-medium">{homeTeam}</p>
          <p className="text-lg font-bold text-green-600">{homeXG.toFixed(2)}</p>
          {homeDiff !== null && (
            <p
              className={cn(
                'text-[10px]',
                homeDiff > 0 ? 'text-green-600' : homeDiff < 0 ? 'text-red-600' : 'text-muted-foreground'
              )}
            >
              {homeDiff > 0 ? '+' : ''}
              {homeDiff.toFixed(2)} vs actual
            </p>
          )}
        </div>
        <div className="text-center text-muted-foreground">xG</div>
        <div className="text-right">
          <p className="font-medium">{awayTeam}</p>
          <p className="text-lg font-bold text-red-600">{awayXG.toFixed(2)}</p>
          {awayDiff !== null && (
            <p
              className={cn(
                'text-[10px]',
                awayDiff > 0 ? 'text-green-600' : awayDiff < 0 ? 'text-red-600' : 'text-muted-foreground'
              )}
            >
              {awayDiff > 0 ? '+' : ''}
              {awayDiff.toFixed(2)} vs actual
            </p>
          )}
        </div>
      </div>
      <div className="h-2 flex rounded-full overflow-hidden">
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${homePercent}%` }}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${awayPercent}%` }}
        />
      </div>
    </div>
  )
}
