'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'

interface FactorData {
  factor: string
  label: string
  score: number
  weight: number
  contribution?: number
}

interface FactorRadarChartProps {
  factors: FactorData[]
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

const FACTOR_COLORS = {
  A: '#22c55e', // green
  B: '#3b82f6', // blue
  C: '#f59e0b', // amber
  D: '#8b5cf6', // purple
  E: '#ef4444', // red
  F: '#06b6d4', // cyan
}

const sizeClasses = {
  sm: 'h-40',
  md: 'h-56',
  lg: 'h-72',
}

export function FactorRadarChart({
  factors,
  size = 'md',
  showLabels = true,
  className,
}: FactorRadarChartProps) {
  const data = factors.map((f) => ({
    factor: f.factor,
    label: showLabels ? `${f.factor}: ${f.label}` : f.factor,
    score: f.score,
    fullMark: 100,
  }))

  return (
    <div className={cn(sizeClasses[size], className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="factor"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            tickCount={5}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}/100`, 'Score']}
            labelFormatter={(label) => {
              const factor = factors.find((f) => f.factor === label)
              return factor ? `${factor.factor}: ${factor.label}` : label
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
