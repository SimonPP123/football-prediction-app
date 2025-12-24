'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { PredictionTable } from '@/components/predictions/prediction-table'
import { LayoutGrid, List, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PredictionsPage() {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingIds, setGeneratingIds] = useState<string[]>([])
  const [generatingAll, setGeneratingAll] = useState(false)

  useEffect(() => {
    fetchFixtures()
  }, [])

  const fetchFixtures = async () => {
    try {
      const res = await fetch('/api/fixtures/upcoming')
      const data = await res.json()
      setFixtures(data)
    } catch (error) {
      console.error('Failed to fetch fixtures:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePrediction = async (fixtureId: string) => {
    setGeneratingIds(prev => [...prev, fixtureId])

    try {
      const res = await fetch('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixture_id: fixtureId }),
      })

      if (res.ok) {
        // Refresh fixtures to get new prediction
        await fetchFixtures()
      }
    } catch (error) {
      console.error('Failed to generate prediction:', error)
    } finally {
      setGeneratingIds(prev => prev.filter(id => id !== fixtureId))
    }
  }

  const handleGenerateAll = async () => {
    const fixturesWithoutPredictions = fixtures.filter(f => !f.prediction?.[0])
    if (fixturesWithoutPredictions.length === 0) return

    setGeneratingAll(true)

    for (const fixture of fixturesWithoutPredictions) {
      await handleGeneratePrediction(fixture.id)
    }

    setGeneratingAll(false)
  }

  const fixturesWithPredictions = fixtures.filter(f => f.prediction?.[0])
  const fixturesWithoutPredictions = fixtures.filter(f => !f.prediction?.[0])

  return (
    <div className="min-h-screen">
      <Header
        title="Predictions"
        subtitle="AI-powered match predictions"
      />

      <div className="p-6">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'cards'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {fixturesWithPredictions.length} / {fixtures.length} predicted
            </span>
            <button
              onClick={handleGenerateAll}
              disabled={generatingAll || fixturesWithoutPredictions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {generatingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Generate All ({fixturesWithoutPredictions.length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : fixtures.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No upcoming fixtures found
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {fixtures.map(fixture => (
              <PredictionCard
                key={fixture.id}
                fixture={fixture}
                onGeneratePrediction={handleGeneratePrediction}
                isGenerating={generatingIds.includes(fixture.id)}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <PredictionTable
            fixtures={fixtures}
            onGeneratePrediction={handleGeneratePrediction}
            generatingIds={generatingIds}
          />
        )}
      </div>
    </div>
  )
}
