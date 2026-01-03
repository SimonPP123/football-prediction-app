'use client'

import { useState, useEffect } from 'react'
import { Activity, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalibrationBucket {
  bucket: string
  expectedRate: number
  actualRate: number
  count: number
}

interface CalibrationChartProps {
  leagueId?: string
}

export function CalibrationChart({ leagueId }: CalibrationChartProps) {
  const [data, setData] = useState<CalibrationBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [leagueId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const url = leagueId ? `/api/accuracy-stats/calibration?league_id=${leagueId}` : '/api/accuracy-stats/calibration'
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch calibration data')
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      console.error('Error fetching calibration data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-card border rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading calibration data...
      </div>
    )
  }

  if (error || data.length === 0) {
    return null
  }

  // Calculate calibration score (lower is better - perfect calibration = 0)
  const calibrationScore = data.reduce((sum, bucket) => {
    const diff = Math.abs(bucket.expectedRate - bucket.actualRate)
    return sum + diff * bucket.count
  }, 0) / data.reduce((sum, bucket) => sum + bucket.count, 0)

  const getCalibrationStatus = (expected: number, actual: number) => {
    const diff = actual - expected
    if (Math.abs(diff) <= 5) return 'calibrated'
    if (diff > 0) return 'overperforming'
    return 'underperforming'
  }

  const maxHeight = 100 // pixels

  return (
    <div className="p-4 bg-card border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Calibration Analysis
        </h3>
        <span className={cn(
          "text-sm font-medium px-2 py-0.5 rounded",
          calibrationScore <= 10 ? "bg-green-500/10 text-green-500" :
          calibrationScore <= 20 ? "bg-yellow-500/10 text-yellow-500" :
          "bg-red-500/10 text-red-500"
        )}>
          {calibrationScore <= 10 ? 'Well Calibrated' :
           calibrationScore <= 20 ? 'Moderately Calibrated' :
           'Needs Improvement'}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Compares predicted confidence levels with actual accuracy. A well-calibrated model
        should have predictions at 70% confidence hitting ~70% of the time.
      </p>

      {/* Chart */}
      <div className="flex items-end gap-2 h-32 mb-2">
        {data.map((bucket) => {
          const status = getCalibrationStatus(bucket.expectedRate, bucket.actualRate)
          const expectedHeight = (bucket.expectedRate / 100) * maxHeight
          const actualHeight = (bucket.actualRate / 100) * maxHeight

          return (
            <div key={bucket.bucket} className="flex-1 relative group">
              {/* Expected (dotted line) */}
              <div
                className="absolute bottom-0 left-1/4 right-1/4 border-t-2 border-dashed border-muted-foreground/50"
                style={{ bottom: `${expectedHeight}px` }}
              />

              {/* Actual (bar) */}
              <div
                className={cn(
                  "absolute bottom-0 left-1 right-1 rounded-t transition-all",
                  status === 'calibrated' && "bg-green-500",
                  status === 'overperforming' && "bg-blue-500",
                  status === 'underperforming' && "bg-red-500"
                )}
                style={{ height: `${actualHeight}px` }}
              />

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                  <div className="font-medium">{bucket.bucket}%</div>
                  <div className="text-muted-foreground">Expected: {bucket.expectedRate}%</div>
                  <div className={cn(
                    status === 'calibrated' && "text-green-500",
                    status === 'overperforming' && "text-blue-500",
                    status === 'underperforming' && "text-red-500"
                  )}>
                    Actual: {Math.round(bucket.actualRate)}%
                  </div>
                  <div className="text-muted-foreground">{bucket.count} predictions</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        {data.map((bucket) => (
          <div key={bucket.bucket} className="flex-1 text-center">
            {bucket.bucket}%
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Calibrated (±5%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>Overperforming</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>Underperforming</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 border-t-2 border-dashed border-muted-foreground/50" />
          <span>Expected</span>
        </div>
      </div>
    </div>
  )
}
