'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import {
  Calendar,
  Trophy,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Check,
  X,
  Trash2,
  Database,
  Users,
  Target,
  ChevronDown,
  ChevronRight,
  Globe,
  MapPin,
  Activity,
  UserCheck,
  Repeat,
  Award,
  Briefcase,
  ArrowLeftRight,
  DollarSign,
  CloudRain,
  Gavel,
  Sparkles,
  History,
  Brain,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ENDPOINTS, API_BASE } from '@/lib/api-football'

// Types
interface LogEntry {
  id: string
  time: string
  type: 'info' | 'success' | 'error' | 'warning' | 'progress'
  category: string
  message: string
  details?: {
    endpoint?: string
    progress?: { current: number; total: number }
  }
}

interface TableStats {
  count: number
  lastUpdated?: string | null
}

interface DataSource {
  id: string
  name: string
  tableName: string
  endpoint: string | null
  refreshEndpoint: string | null
  icon: any
  description: string
  estimatedTime?: string
  rateLimit?: string
}

interface Category {
  id: string
  name: string
  icon: any
  description: string
  dataSources: DataSource[]
}

// Category and data source configuration
const categories: Category[] = [
  {
    id: 'core',
    name: 'Core Foundation',
    icon: Database,
    description: 'Essential data tables',
    dataSources: [
      { id: 'leagues', name: 'Leagues', tableName: 'leagues', endpoint: null, refreshEndpoint: null, icon: Globe, description: 'League information', estimatedTime: 'Static' },
      { id: 'venues', name: 'Venues', tableName: 'venues', endpoint: ENDPOINTS.teams.url, refreshEndpoint: '/api/data/refresh/teams', icon: MapPin, description: 'Stadium data', estimatedTime: '~5s' },
      { id: 'teams', name: 'Teams', tableName: 'teams', endpoint: ENDPOINTS.teams.url, refreshEndpoint: '/api/data/refresh/teams', icon: Users, description: 'Club data', estimatedTime: '~5s' },
      { id: 'fixtures', name: 'Fixtures', tableName: 'fixtures', endpoint: ENDPOINTS.fixtures.url, refreshEndpoint: '/api/data/refresh/fixtures', icon: Calendar, description: 'Match schedule', estimatedTime: '~15s' },
    ],
  },
  {
    id: 'match',
    name: 'Match Data',
    icon: Activity,
    description: 'Per-match statistics and events',
    dataSources: [
      { id: 'fixture_statistics', name: 'Match Statistics', tableName: 'fixture_statistics', endpoint: ENDPOINTS.fixtureStatistics.url, refreshEndpoint: '/api/data/refresh/fixture-statistics', icon: BarChart3, description: 'Per-match stats', estimatedTime: '~5min', rateLimit: '500ms/fixture' },
      { id: 'fixture_events', name: 'Match Events', tableName: 'fixture_events', endpoint: ENDPOINTS.fixtureEvents.url, refreshEndpoint: '/api/data/refresh/fixture-events', icon: Target, description: 'Goals, cards, subs', estimatedTime: '~3min', rateLimit: '300ms/fixture' },
      { id: 'lineups', name: 'Lineups', tableName: 'lineups', endpoint: ENDPOINTS.lineups.url, refreshEndpoint: '/api/data/refresh/lineups', icon: UserCheck, description: 'Starting XI', estimatedTime: '~3min', rateLimit: '300ms/fixture' },
      { id: 'standings', name: 'Standings', tableName: 'standings', endpoint: ENDPOINTS.standings.url, refreshEndpoint: '/api/data/refresh/standings', icon: Trophy, description: 'League table', estimatedTime: '~5s' },
    ],
  },
  {
    id: 'team',
    name: 'Team Intelligence',
    icon: BarChart3,
    description: 'Team analytics and history',
    dataSources: [
      { id: 'team_season_stats', name: 'Team Stats', tableName: 'team_season_stats', endpoint: ENDPOINTS.teamStats.url, refreshEndpoint: '/api/data/refresh/team-stats', icon: BarChart3, description: 'Season aggregates', estimatedTime: '~10s', rateLimit: '300ms/team' },
      { id: 'injuries', name: 'Injuries', tableName: 'injuries', endpoint: ENDPOINTS.injuries.url, refreshEndpoint: '/api/data/refresh/injuries', icon: AlertTriangle, description: 'Current injuries', estimatedTime: '~5s' },
      { id: 'head_to_head', name: 'Head-to-Head', tableName: 'head_to_head', endpoint: ENDPOINTS.headToHead.url, refreshEndpoint: '/api/data/refresh/head-to-head', icon: Repeat, description: 'H2H history', estimatedTime: '~2min', rateLimit: '300ms/pair' },
    ],
  },
  {
    id: 'player',
    name: 'Player Data',
    icon: Users,
    description: 'Player profiles and statistics',
    dataSources: [
      { id: 'players', name: 'Players', tableName: 'players', endpoint: ENDPOINTS.players.url, refreshEndpoint: '/api/data/refresh/player-stats', icon: Users, description: 'Player profiles', estimatedTime: '~5min', rateLimit: '400ms/page' },
      { id: 'player_squads', name: 'Squads', tableName: 'player_squads', endpoint: ENDPOINTS.playerSquads.url, refreshEndpoint: '/api/data/refresh/player-squads', icon: UserCheck, description: 'Current rosters', estimatedTime: '~10s', rateLimit: '300ms/team' },
      { id: 'player_season_stats', name: 'Season Stats', tableName: 'player_season_stats', endpoint: ENDPOINTS.players.url, refreshEndpoint: '/api/data/refresh/player-stats', icon: BarChart3, description: 'Player season stats', estimatedTime: '~5min', rateLimit: '400ms/page' },
      { id: 'player_match_stats', name: 'Match Stats', tableName: 'player_match_stats', endpoint: null, refreshEndpoint: null, icon: Activity, description: 'Per-match player stats', estimatedTime: 'Via Lineups' },
      { id: 'top_performers', name: 'Top Performers', tableName: 'top_performers', endpoint: ENDPOINTS.topScorers.url, refreshEndpoint: '/api/data/refresh/top-performers', icon: Award, description: 'Scorers, assists', estimatedTime: '~5s' },
      { id: 'coaches', name: 'Coaches', tableName: 'coaches', endpoint: ENDPOINTS.coaches.url, refreshEndpoint: '/api/data/refresh/coaches', icon: Briefcase, description: 'Manager info', estimatedTime: '~10s', rateLimit: '300ms/team' },
    ],
  },
  {
    id: 'external',
    name: 'External Data',
    icon: Globe,
    description: 'External APIs and computed data',
    dataSources: [
      { id: 'odds', name: 'Odds', tableName: 'odds', endpoint: 'The Odds API', refreshEndpoint: null, icon: DollarSign, description: 'Betting odds', estimatedTime: 'Manual' },
      { id: 'weather', name: 'Weather', tableName: 'weather', endpoint: 'Open-Meteo API', refreshEndpoint: null, icon: CloudRain, description: 'Match weather', estimatedTime: 'Manual' },
      { id: 'referee_stats', name: 'Referee Stats', tableName: 'referee_stats', endpoint: 'Computed', refreshEndpoint: null, icon: Gavel, description: 'Referee tendencies', estimatedTime: 'Computed' },
      { id: 'transfers', name: 'Transfers', tableName: 'transfers', endpoint: ENDPOINTS.transfers.url, refreshEndpoint: '/api/data/refresh/transfers', icon: ArrowLeftRight, description: 'Transfer history', estimatedTime: '~30s', rateLimit: '300ms/team' },
    ],
  },
  {
    id: 'prediction',
    name: 'AI Predictions',
    icon: Sparkles,
    description: 'Prediction data and history',
    dataSources: [
      { id: 'predictions', name: 'Predictions', tableName: 'predictions', endpoint: 'n8n Webhook', refreshEndpoint: null, icon: Target, description: 'AI predictions', estimatedTime: 'Via Predictions page' },
      { id: 'prediction_history', name: 'Prediction History', tableName: 'prediction_history', endpoint: null, refreshEndpoint: null, icon: History, description: 'Version history', estimatedTime: 'Internal' },
      { id: 'api_predictions', name: 'API Predictions', tableName: 'api_predictions', endpoint: 'API-Football Predictions', refreshEndpoint: null, icon: Brain, description: 'External predictions', estimatedTime: 'Future' },
    ],
  },
]

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export default function DataManagementPage() {
  const [stats, setStats] = useState<Record<string, TableStats> | null>(null)
  const [summary, setSummary] = useState<{ totalTables: number; totalRecords: number; lastSync: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})
  const [refreshStatus, setRefreshStatus] = useState<Record<string, 'idle' | 'success' | 'error'>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    core: true,
    match: true,
    team: true,
    player: false,
    external: false,
    prediction: false,
  })
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/data/stats')
      const data = await res.json()
      const { _summary, ...tableStats } = data
      setStats(tableStats)
      setSummary(_summary)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      addLog('error', 'system', 'Failed to fetch database statistics')
    } finally {
      setLoading(false)
    }
  }

  const addLog = (type: LogEntry['type'], category: string, message: string, details?: LogEntry['details']) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time: getTimestamp(),
      type,
      category,
      message,
      details,
    }
    setLogs(prev => [...prev, entry])
  }

  const clearLogs = () => setLogs([])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  const copyEndpoint = (endpoint: string, sourceId: string) => {
    navigator.clipboard.writeText(endpoint)
    setCopiedEndpoint(sourceId)
    setTimeout(() => setCopiedEndpoint(null), 2000)
  }

  const handleRefresh = async (source: DataSource) => {
    if (!source.refreshEndpoint) return

    setRefreshing(prev => ({ ...prev, [source.id]: true }))
    setRefreshStatus(prev => ({ ...prev, [source.id]: 'idle' }))

    addLog('info', source.id, `Starting ${source.name.toLowerCase()} refresh...`, {
      endpoint: source.endpoint || undefined,
    })

    try {
      const res = await fetch(source.refreshEndpoint, { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        // Add all logs from response
        if (data.logs && Array.isArray(data.logs)) {
          data.logs.forEach((log: any) => {
            addLog(log.type || 'info', source.id, log.message, log.details)
          })
        }

        const duration = data.duration ? ` (${(data.duration / 1000).toFixed(1)}s)` : ''
        addLog('success', source.id, `${source.name}: ${data.imported} imported, ${data.errors} errors${duration}`)
        setRefreshStatus(prev => ({ ...prev, [source.id]: 'success' }))
        await fetchStats()
      } else {
        addLog('error', source.id, `${source.name} failed: ${data.error || 'Unknown error'}`)
        setRefreshStatus(prev => ({ ...prev, [source.id]: 'error' }))
      }
    } catch (error) {
      addLog('error', source.id, `${source.name} failed: ${error instanceof Error ? error.message : 'Network error'}`)
      setRefreshStatus(prev => ({ ...prev, [source.id]: 'error' }))
    } finally {
      setRefreshing(prev => ({ ...prev, [source.id]: false }))
      setTimeout(() => setRefreshStatus(prev => ({ ...prev, [source.id]: 'idle' })), 3000)
    }
  }

  const handleRefreshAll = async () => {
    addLog('info', 'system', 'Starting refresh of all data sources...')

    const refreshableSources = categories.flatMap(c => c.dataSources.filter(s => s.refreshEndpoint))

    for (const source of refreshableSources) {
      await handleRefresh(source)
    }

    addLog('success', 'system', 'All data sources refreshed')
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-500'
      case 'error': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      case 'progress': return 'text-purple-500'
      default: return 'text-blue-500'
    }
  }

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return '✓'
      case 'error': return '✗'
      case 'warning': return '⚠'
      case 'progress': return '⟳'
      default: return '→'
    }
  }

  const totalRefreshable = categories.flatMap(c => c.dataSources.filter(s => s.refreshEndpoint)).length

  return (
    <div className="min-h-screen">
      <Header title="Data Management" subtitle="Manage API data and database" />

      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Tables:</span>
              <span className="font-bold">{summary?.totalTables || 24}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Total Records:</span>
              <span className="font-bold">{summary?.totalRecords?.toLocaleString() || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Last Sync:</span>
              <span className="font-bold">{formatRelativeTime(summary?.lastSync)}</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Refreshable:</span>
              <span className="font-bold">{totalRefreshable} endpoints</span>
            </div>
            <div className="ml-auto">
              <button
                onClick={handleRefreshAll}
                disabled={Object.values(refreshing).some(Boolean)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <RefreshCw className={cn("w-4 h-4", Object.values(refreshing).some(Boolean) && "animate-spin")} />
                Refresh All
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {categories.map(category => {
            const CategoryIcon = category.icon
            const isExpanded = expandedCategories[category.id]
            const categoryStats = category.dataSources.reduce((acc, s) => {
              const tableStats = stats?.[s.tableName]
              return acc + (tableStats?.count || 0)
            }, 0)

            return (
              <div key={category.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {category.dataSources.length} tables · {categoryStats.toLocaleString()} records
                    </span>
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>

                {/* Data Sources */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                      {category.dataSources.map(source => {
                        const Icon = source.icon
                        const tableStats = stats?.[source.tableName]
                        const isRefreshing = refreshing[source.id]
                        const status = refreshStatus[source.id] || 'idle'
                        const canRefresh = !!source.refreshEndpoint

                        return (
                          <div
                            key={source.id}
                            className="bg-muted/30 rounded-lg p-4 space-y-3"
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-primary" />
                                <div>
                                  <h4 className="font-medium text-sm">{source.name}</h4>
                                  <p className="text-xs text-muted-foreground">{source.description}</p>
                                </div>
                              </div>
                              {source.estimatedTime && (
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  {source.estimatedTime}
                                </span>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="flex gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">Records: </span>
                                <span className="font-medium">{tableStats?.count?.toLocaleString() ?? '-'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Updated: </span>
                                <span className="font-medium">{formatRelativeTime(tableStats?.lastUpdated)}</span>
                              </div>
                            </div>

                            {/* Endpoint */}
                            {source.endpoint && (
                              <div className="relative">
                                <div className="bg-background border border-border rounded p-2 pr-8 text-xs font-mono overflow-x-auto">
                                  <span className="text-green-500">GET</span>{' '}
                                  <span className="text-muted-foreground break-all">
                                    {source.endpoint.startsWith('http')
                                      ? source.endpoint.replace(API_BASE, '')
                                      : source.endpoint
                                    }
                                  </span>
                                </div>
                                {source.endpoint.startsWith('http') && (
                                  <button
                                    onClick={() => copyEndpoint(source.endpoint!, source.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                                    title="Copy endpoint"
                                  >
                                    {copiedEndpoint === source.id ? (
                                      <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-muted-foreground" />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Refresh Button */}
                            {canRefresh && (
                              <button
                                onClick={() => handleRefresh(source)}
                                disabled={isRefreshing}
                                className={cn(
                                  "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                                  status === 'success' && "bg-green-500/20 text-green-500",
                                  status === 'error' && "bg-red-500/20 text-red-500",
                                  status === 'idle' && "bg-primary/10 text-primary hover:bg-primary/20",
                                  isRefreshing && "opacity-70"
                                )}
                              >
                                {isRefreshing ? (
                                  <><Loader2 className="w-3 h-3 animate-spin" /> Refreshing...</>
                                ) : status === 'success' ? (
                                  <><Check className="w-3 h-3" /> Updated!</>
                                ) : status === 'error' ? (
                                  <><X className="w-3 h-3" /> Failed</>
                                ) : (
                                  <><RefreshCw className="w-3 h-3" /> Refresh</>
                                )}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Activity Log */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Log
              {logs.length > 0 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{logs.length} entries</span>
              )}
            </h3>
            <button
              onClick={clearLogs}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>

          <div
            ref={logContainerRef}
            className="h-80 overflow-y-auto bg-muted/30 p-4 font-mono text-xs"
          >
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                No activity yet. Click a refresh button to start.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map(log => (
                  <div key={log.id} className="flex gap-2 hover:bg-muted/50 px-1 -mx-1 rounded">
                    <span className="text-muted-foreground shrink-0">[{log.time}]</span>
                    <span className={cn("shrink-0 w-4 text-center", getLogColor(log.type))}>
                      {getLogIcon(log.type)}
                    </span>
                    <span className="text-muted-foreground shrink-0 w-20 truncate">{log.category}</span>
                    <span className={cn("flex-1", getLogColor(log.type))}>
                      {log.message}
                      {log.details?.progress && (
                        <span className="text-muted-foreground ml-2">
                          ({log.details.progress.current}/{log.details.progress.total})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
