'use client'

import { useState, useEffect } from 'react'
import { Cpu, Trophy, Target, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModelStats {
  model: string
  total: number
  result_accuracy: number
  score_accuracy: number
  over_under_accuracy: number
  btts_accuracy: number
  average_accuracy: number
}

export function ModelComparison() {
  const [models, setModels] = useState<ModelStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/accuracy-stats/by-model', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch model stats')
      const data = await response.json()
      setModels(data)
    } catch (err: any) {
      console.error('Error fetching model comparison:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-card border rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading model comparison...
      </div>
    )
  }

  if (error || models.length === 0) {
    return null
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-green-500'
    if (accuracy >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Get the best model
  const bestModel = models[0]

  return (
    <div className="p-4 bg-card border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          Model Comparison
        </h3>
        <span className="text-sm text-muted-foreground">
          {models.length} model{models.length !== 1 ? 's' : ''} compared
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Model</th>
              <th className="pb-2 font-medium text-center">Matches</th>
              <th className="pb-2 font-medium text-center">1X2</th>
              <th className="pb-2 font-medium text-center">Score</th>
              <th className="pb-2 font-medium text-center">O/U</th>
              <th className="pb-2 font-medium text-center">BTTS</th>
              <th className="pb-2 font-medium text-center">Overall</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model, idx) => (
              <tr
                key={model.model}
                className={cn(
                  "border-b last:border-0",
                  idx === 0 && "bg-primary/5"
                )}
              >
                <td className="py-2 flex items-center gap-2">
                  {idx === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                  <span className={cn(
                    "font-medium",
                    idx === 0 && "text-primary"
                  )}>
                    {model.model}
                  </span>
                </td>
                <td className="py-2 text-center text-muted-foreground">
                  {model.total}
                </td>
                <td className={cn("py-2 text-center font-medium", getAccuracyColor(model.result_accuracy))}>
                  {Math.round(model.result_accuracy)}%
                </td>
                <td className={cn("py-2 text-center font-medium", getAccuracyColor(model.score_accuracy))}>
                  {Math.round(model.score_accuracy)}%
                </td>
                <td className={cn("py-2 text-center font-medium", getAccuracyColor(model.over_under_accuracy))}>
                  {Math.round(model.over_under_accuracy)}%
                </td>
                <td className={cn("py-2 text-center font-medium", getAccuracyColor(model.btts_accuracy))}>
                  {Math.round(model.btts_accuracy)}%
                </td>
                <td className={cn("py-2 text-center font-bold", getAccuracyColor(model.average_accuracy))}>
                  {Math.round(model.average_accuracy)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bestModel && (
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-2">
          <Trophy className="w-3 h-3 text-yellow-500" />
          Best performer: <span className="font-medium text-foreground">{bestModel.model}</span>
          with {Math.round(bestModel.average_accuracy)}% overall accuracy
        </div>
      )}
    </div>
  )
}
