'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Zap, Loader2, Check, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLeague } from '@/contexts/league-context'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DataRefreshModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PhaseConfig {
  phase: string
  label: string
  color: string
  hoverColor: string
  endpoints: string[]
  apiEndpoints: string[]
}

const PHASES: PhaseConfig[] = [
  {
    phase: 'pre-match',
    label: 'Pre-Match',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    endpoints: ['fixtures', 'standings', 'injuries', 'teams', 'team-stats', 'odds'],
    apiEndpoints: [
      'GET /fixtures?league=X&season=Y&next=10',
      'GET /standings?league=X&season=Y',
      'GET /injuries?league=X&season=Y',
      'GET /teams?league=X&season=Y',
      'GET /teams/statistics?team={id}',
      'The Odds API (external)',
    ],
  },
  {
    phase: 'imminent',
    label: 'Imminent',
    color: 'bg-amber-500',
    hoverColor: 'hover:bg-amber-600',
    endpoints: ['lineups', 'odds', 'injuries'],
    apiEndpoints: [
      'GET /fixtures/lineups?fixture={id}',
      'The Odds API (external)',
      'GET /injuries?league=X&season=Y',
    ],
  },
  {
    phase: 'live',
    label: 'Live',
    color: 'bg-red-500',
    hoverColor: 'hover:bg-red-600',
    endpoints: ['fixtures (live)', 'fixture-statistics', 'fixture-events'],
    apiEndpoints: [
      'GET /fixtures?league=X&live=all',
      'GET /fixtures/statistics?fixture={id}',
      'GET /fixtures/events?fixture={id}',
    ],
  },
  {
    phase: 'post-match',
    label: 'Post-Match',
    color: 'bg-emerald-500',
    hoverColor: 'hover:bg-emerald-600',
    endpoints: ['fixtures', 'fixture-statistics', 'fixture-events', 'standings', 'team-stats', 'player-stats', 'top-performers'],
    apiEndpoints: [
      'GET /fixtures?league=X&season=Y&last=20',
      'GET /fixtures/statistics?fixture={id}',
      'GET /fixtures/events?fixture={id}',
      'GET /standings?league=X&season=Y',
      'GET /teams/statistics?team={id}',
      'GET /players?league=X&season=Y',
      'GET /players/topscorers?league=X',
    ],
  },
]

interface RefreshResult {
  phase: string
  success: boolean
  summary: {
    successful: number
    total: number
    duration: number
  }
  refreshed?: string[]
  failed?: { endpoint: string; error: string }[]
}

export function DataRefreshModal({ isOpen, onClose }: DataRefreshModalProps) {
  const router = useRouter()
  const { currentLeague } = useLeague()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshingPhase, setRefreshingPhase] = useState<string | null>(null)
  const [result, setResult] = useState<RefreshResult | null>(null)

  if (!isOpen) return null

  const handlePhaseRefresh = async (phase: PhaseConfig) => {
    if (!currentLeague) return

    setIsRefreshing(true)
    setRefreshingPhase(phase.phase)
    setResult(null)

    try {
      const res = await fetch(
        `/api/data/refresh/phase?phase=${phase.phase}&league_id=${currentLeague.id}`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      const data = await res.json()
      setResult(data)

      // Refresh the page data if the refresh was successful
      if (data.success) {
        router.refresh()
      }
    } catch (err) {
      setResult({
        phase: phase.phase,
        success: false,
        summary: { successful: 0, total: 0, duration: 0 },
      })
    } finally {
      setIsRefreshing(false)
      setRefreshingPhase(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] z-50 flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg shadow-xl w-full max-h-full overflow-hidden flex flex-col">
          {/* Header - Sticky */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Data Refresh</h2>
              {currentLeague && (
                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                  {currentLeague.name}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {!currentLeague ? (
              <p className="text-muted-foreground text-center py-8">
                No league selected
              </p>
            ) : (
              <>
                {/* Phase Buttons */}
                <TooltipProvider delayDuration={200}>
                  <div className="grid grid-cols-2 gap-3">
                    {PHASES.map((phase) => {
                      const isCurrentPhaseRefreshing = refreshingPhase === phase.phase
                      return (
                        <Tooltip key={phase.phase}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handlePhaseRefresh(phase)}
                              disabled={isRefreshing}
                              className={cn(
                                'flex flex-col items-center gap-1 p-4 rounded-lg text-white transition-colors disabled:opacity-50',
                                phase.color,
                                phase.hoverColor
                              )}
                            >
                              {isCurrentPhaseRefreshing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-5 h-5" />
                              )}
                              <span className="font-medium">{phase.label}</span>
                              <span className="text-xs opacity-80">
                                {phase.endpoints.length} endpoints
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm">
                            <p className="font-semibold mb-1">{phase.label} Phase</p>
                            <div className="text-xs space-y-0.5">
                              {phase.apiEndpoints.map((ep, i) => (
                                <div
                                  key={i}
                                  className="font-mono text-[10px] text-muted-foreground"
                                >
                                  {ep}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </TooltipProvider>

                {/* Result */}
                {result && (
                  <div
                    className={cn(
                      'p-3 rounded-lg text-sm',
                      result.success
                        ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900'
                        : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {result.success ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className="font-medium">
                        {result.phase}: {result.summary.successful}/{result.summary.total}{' '}
                        successful
                      </span>
                      <span className="text-muted-foreground">
                        ({(result.summary.duration / 1000).toFixed(1)}s)
                      </span>
                    </div>
                    {result.refreshed && result.refreshed.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        Refreshed: {result.refreshed.join(', ')}
                      </p>
                    )}
                    {result.failed && result.failed.length > 0 && (
                      <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                        Failed: {result.failed.map((f) => f.endpoint).join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Endpoint Documentation - Collapsible on mobile */}
                <details className="bg-muted/50 rounded-lg text-xs">
                  <summary className="p-3 cursor-pointer font-medium text-sm hover:bg-muted/70 rounded-lg transition-colors">
                    API-Football Endpoints by Phase
                  </summary>
                  <div className="px-3 pb-3 space-y-3">
                    <div className="text-[10px] text-muted-foreground">
                      Base URL:{' '}
                      <code className="bg-muted px-1 rounded">
                        https://v3.football.api-sports.io
                      </code>
                      {currentLeague && (
                        <span className="ml-2">
                          League: {currentLeague.apiId} | Season:{' '}
                          {currentLeague.currentSeason}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {PHASES.map((phase) => (
                        <div key={phase.phase}>
                          <span
                            className={cn(
                              'font-medium',
                              phase.phase === 'pre-match' && 'text-blue-600',
                              phase.phase === 'imminent' && 'text-amber-600',
                              phase.phase === 'live' && 'text-red-600',
                              phase.phase === 'post-match' && 'text-emerald-600'
                            )}
                          >
                            {phase.label} ({phase.apiEndpoints.length} endpoints):
                          </span>
                          <div className="text-muted-foreground ml-2 space-y-0.5 mt-1">
                            {phase.apiEndpoints.map((ep, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span
                                  className={cn(
                                    'shrink-0',
                                    phase.phase === 'pre-match' && 'text-blue-500',
                                    phase.phase === 'imminent' && 'text-amber-500',
                                    phase.phase === 'live' && 'text-red-500',
                                    phase.phase === 'post-match' && 'text-emerald-500'
                                  )}
                                >
                                  {'\u2192'}
                                </span>
                                <code className="break-all text-[10px]">{ep}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">
              For detailed data management, visit the{' '}
              <a href="/data" className="text-primary hover:underline">
                Data page
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
