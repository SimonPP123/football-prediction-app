'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import {
  Calendar,
  CalendarPlus,
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
  UsersRound,
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
  Square,
  Zap,
  CheckCircle,
  HelpCircle,
  PlayCircle,
  Clock,
  PauseCircle,
  BarChart,
} from 'lucide-react'
import { useDataStatus, useSmartRefresh, getUrgencyClasses, formatTimeUntil } from '@/hooks/use-data-status'
import { cn } from '@/lib/utils'
import { ENDPOINTS, API_BASE } from '@/lib/api-football'
import { DATA_SOURCE_DOCS } from '@/lib/data-source-docs'
import { DataSourceDetails } from '@/components/data/data-source-details'
import { OddsMatchSelector } from '@/components/data-management/odds-match-selector'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLeague, LeagueConfig } from '@/contexts/league-context'

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

type DataCategory = 'master' | 'live' | 'post-match' | 'historical' | 'external' | 'ai'

interface DataSource {
  id: string
  name: string
  tableName: string
  targetTables: string[]
  endpoint: string | null
  refreshEndpoint: string | null
  icon: any
  description: string
  dataCategory: DataCategory
  refreshSchedule: string
  refreshExample: string
  estimatedTime?: string
  rateLimit?: string
  dependencies?: string[]
}

const categoryStyles: Record<DataCategory, { label: string; color: string; bg: string }> = {
  master: { label: 'Master', color: 'text-slate-600', bg: 'bg-slate-100' },
  live: { label: 'Live', color: 'text-red-600', bg: 'bg-red-100' },
  'post-match': { label: 'Post-Match', color: 'text-orange-600', bg: 'bg-orange-100' },
  historical: { label: 'Historical', color: 'text-blue-600', bg: 'bg-blue-100' },
  external: { label: 'External', color: 'text-purple-600', bg: 'bg-purple-100' },
  ai: { label: 'AI', color: 'text-emerald-600', bg: 'bg-emerald-100' },
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
      { id: 'leagues', name: 'Leagues', tableName: 'leagues', targetTables: ['leagues'], endpoint: null, refreshEndpoint: null, icon: Globe, description: 'League information', dataCategory: 'master', refreshSchedule: 'One-time', refreshExample: 'Pre-configured in database', estimatedTime: 'Static' },
      { id: 'venues', name: 'Venues', tableName: 'venues', targetTables: ['venues'], endpoint: ENDPOINTS.teams.url, refreshEndpoint: '/api/data/refresh/teams', icon: MapPin, description: 'Stadium data', dataCategory: 'master', refreshSchedule: 'Season start', refreshExample: 'Refresh once in August', estimatedTime: '~5s' },
      { id: 'teams', name: 'Teams', tableName: 'teams', targetTables: ['teams', 'venues'], endpoint: ENDPOINTS.teams.url, refreshEndpoint: '/api/data/refresh/teams', icon: Users, description: 'Club data', dataCategory: 'master', refreshSchedule: 'Season start', refreshExample: 'Refresh once in August', estimatedTime: '~5s' },
      { id: 'fixtures', name: 'Fixtures', tableName: 'fixtures', targetTables: ['fixtures'], endpoint: ENDPOINTS.fixtures.url, refreshEndpoint: '/api/data/refresh/fixtures', icon: Calendar, description: 'Match schedule', dataCategory: 'live', refreshSchedule: 'Daily 06:00 UTC', refreshExample: 'Refresh every morning for updates', estimatedTime: '~15s', dependencies: ['teams', 'venues'] },
    ],
  },
  {
    id: 'match',
    name: 'Match Data',
    icon: Activity,
    description: 'Per-match statistics and events',
    dataSources: [
      { id: 'fixture_statistics', name: 'Match Statistics', tableName: 'fixture_statistics', targetTables: ['fixture_statistics'], endpoint: ENDPOINTS.fixtureStatistics.url, refreshEndpoint: '/api/data/refresh/fixture-statistics', icon: BarChart3, description: 'Per-match stats', dataCategory: 'post-match', refreshSchedule: 'After FT status', refreshExample: 'Run after matches complete', estimatedTime: '~5min', rateLimit: '500ms/fixture', dependencies: ['fixtures'] },
      { id: 'fixture_events', name: 'Match Events', tableName: 'fixture_events', targetTables: ['fixture_events'], endpoint: ENDPOINTS.fixtureEvents.url, refreshEndpoint: '/api/data/refresh/fixture-events', icon: Target, description: 'Goals, cards, subs', dataCategory: 'post-match', refreshSchedule: 'After FT status', refreshExample: 'Run after matches complete', estimatedTime: '~3min', rateLimit: '300ms/fixture', dependencies: ['fixtures'] },
      { id: 'lineups', name: 'Lineups', tableName: 'lineups', targetTables: ['lineups'], endpoint: ENDPOINTS.lineups.url, refreshEndpoint: '/api/data/refresh/lineups', icon: UserCheck, description: 'Starting XI', dataCategory: 'post-match', refreshSchedule: '1hr before kickoff', refreshExample: 'Available ~60min before match', estimatedTime: '~3min', rateLimit: '300ms/fixture', dependencies: ['fixtures'] },
      { id: 'standings', name: 'Standings', tableName: 'standings', targetTables: ['standings'], endpoint: ENDPOINTS.standings.url, refreshEndpoint: '/api/data/refresh/standings', icon: Trophy, description: 'League table', dataCategory: 'live', refreshSchedule: 'Daily 06:00 UTC', refreshExample: 'Refresh every morning', estimatedTime: '~5s', dependencies: ['teams'] },
    ],
  },
  {
    id: 'team',
    name: 'Team Intelligence',
    icon: BarChart3,
    description: 'Team analytics and history',
    dataSources: [
      { id: 'team_season_stats', name: 'Team Stats', tableName: 'team_season_stats', targetTables: ['team_season_stats'], endpoint: ENDPOINTS.teamStats.url, refreshEndpoint: '/api/data/refresh/team-stats', icon: BarChart3, description: 'Season aggregates', dataCategory: 'historical', refreshSchedule: 'Weekly Sunday', refreshExample: 'Refresh after weekend matches', estimatedTime: '~10s', rateLimit: '300ms/team', dependencies: ['teams'] },
      { id: 'injuries', name: 'Injuries', tableName: 'injuries', targetTables: ['injuries'], endpoint: ENDPOINTS.injuries.url, refreshEndpoint: '/api/data/refresh/injuries', icon: AlertTriangle, description: 'Current injuries', dataCategory: 'live', refreshSchedule: 'Daily 07:30 UTC', refreshExample: 'Refresh morning before matches', estimatedTime: '~5s', dependencies: ['teams', 'players'] },
      { id: 'head_to_head', name: 'Head-to-Head', tableName: 'head_to_head', targetTables: ['head_to_head'], endpoint: ENDPOINTS.headToHead.url, refreshEndpoint: '/api/data/refresh/head-to-head', icon: Repeat, description: 'H2H history', dataCategory: 'historical', refreshSchedule: 'Monthly', refreshExample: 'Refresh once a month', estimatedTime: '~2min', rateLimit: '300ms/pair', dependencies: ['teams'] },
    ],
  },
  {
    id: 'player',
    name: 'Player Data',
    icon: Users,
    description: 'Player profiles and statistics',
    dataSources: [
      { id: 'players', name: 'Players', tableName: 'players', targetTables: ['players', 'player_season_stats'], endpoint: ENDPOINTS.players.url, refreshEndpoint: '/api/data/refresh/player-stats', icon: Users, description: 'Player profiles', dataCategory: 'historical', refreshSchedule: 'Weekly Sunday', refreshExample: 'Refresh after weekend matches', estimatedTime: '~5min', rateLimit: '400ms/page' },
      { id: 'player_squads', name: 'Squads', tableName: 'player_squads', targetTables: ['players', 'player_squads'], endpoint: ENDPOINTS.playerSquads.url, refreshEndpoint: '/api/data/refresh/player-squads', icon: UserCheck, description: 'Current rosters', dataCategory: 'master', refreshSchedule: 'Season start + transfers', refreshExample: 'Refresh after transfer windows', estimatedTime: '~10s', rateLimit: '300ms/team', dependencies: ['teams'] },
      { id: 'player_season_stats', name: 'Season Stats', tableName: 'player_season_stats', targetTables: ['player_season_stats'], endpoint: ENDPOINTS.players.url, refreshEndpoint: '/api/data/refresh/player-stats', icon: BarChart3, description: 'Player season stats', dataCategory: 'historical', refreshSchedule: 'Weekly Sunday', refreshExample: 'Refresh after weekend matches', estimatedTime: '~5min', rateLimit: '400ms/page', dependencies: ['players'] },
      { id: 'player_match_stats', name: 'Match Stats', tableName: 'player_match_stats', targetTables: ['player_match_stats'], endpoint: null, refreshEndpoint: null, icon: Activity, description: 'Per-match player stats', dataCategory: 'post-match', refreshSchedule: 'Via Lineups', refreshExample: 'Auto-populated from lineups', estimatedTime: 'Via Lineups', dependencies: ['lineups'] },
      { id: 'top_performers', name: 'Top Performers', tableName: 'top_performers', targetTables: ['top_performers'], endpoint: ENDPOINTS.topScorers.url, refreshEndpoint: '/api/data/refresh/top-performers', icon: Award, description: 'Scorers, assists', dataCategory: 'historical', refreshSchedule: 'Weekly Sunday', refreshExample: 'Refresh after weekend matches', estimatedTime: '~5s', dependencies: ['players'] },
      { id: 'coaches', name: 'Coaches', tableName: 'coaches', targetTables: ['coaches'], endpoint: ENDPOINTS.coaches.url, refreshEndpoint: '/api/data/refresh/coaches', icon: Briefcase, description: 'Manager info', dataCategory: 'master', refreshSchedule: 'Season start', refreshExample: 'Refresh if manager changes', estimatedTime: '~10s', rateLimit: '300ms/team', dependencies: ['teams'] },
    ],
  },
  {
    id: 'external',
    name: 'External Data',
    icon: Globe,
    description: 'External APIs and computed data',
    dataSources: [
      { id: 'odds', name: 'Odds', tableName: 'odds', targetTables: ['odds'], endpoint: 'The Odds API', refreshEndpoint: '/api/data/refresh/odds', icon: DollarSign, description: 'Betting odds', dataCategory: 'external', refreshSchedule: '4hrs before kickoff', refreshExample: 'Refresh matchday morning', estimatedTime: '~10s', dependencies: ['fixtures'] },
      { id: 'weather', name: 'Weather', tableName: 'weather', targetTables: ['weather'], endpoint: 'Open-Meteo API', refreshEndpoint: '/api/data/refresh/weather', icon: CloudRain, description: 'Match weather', dataCategory: 'external', refreshSchedule: '4hrs before kickoff', refreshExample: 'Refresh matchday morning', estimatedTime: '~10s', dependencies: ['fixtures', 'venues'] },
      { id: 'referee_stats', name: 'Referee Stats', tableName: 'referee_stats', targetTables: ['referee_stats'], endpoint: 'Computed', refreshEndpoint: '/api/data/refresh/referee-stats', icon: Gavel, description: 'Referee tendencies', dataCategory: 'ai', refreshSchedule: 'Weekly', refreshExample: 'Compute after fixture_events', estimatedTime: '~5s', dependencies: ['fixtures', 'fixture_events'] },
      { id: 'transfers', name: 'Transfers', tableName: 'transfers', targetTables: ['transfers'], endpoint: ENDPOINTS.transfers.url, refreshEndpoint: '/api/data/refresh/transfers', icon: ArrowLeftRight, description: 'Transfer history', dataCategory: 'historical', refreshSchedule: 'Transfer windows', refreshExample: 'Refresh Jan & Aug', estimatedTime: '~30s', rateLimit: '300ms/team', dependencies: ['teams', 'players'] },
    ],
  },
  {
    id: 'prediction',
    name: 'AI Predictions',
    icon: Sparkles,
    description: 'Prediction data and history',
    dataSources: [
      { id: 'predictions', name: 'Predictions', tableName: 'predictions', targetTables: ['predictions'], endpoint: 'n8n Webhook', refreshEndpoint: null, icon: Target, description: 'AI predictions', dataCategory: 'ai', refreshSchedule: 'On demand', refreshExample: 'Generate via Predictions page', estimatedTime: 'Via Predictions page' },
      { id: 'prediction_history', name: 'Prediction History', tableName: 'prediction_history', targetTables: ['prediction_history'], endpoint: null, refreshEndpoint: null, icon: History, description: 'Version history', dataCategory: 'ai', refreshSchedule: 'Automatic', refreshExample: 'Auto-tracked on prediction updates', estimatedTime: 'Internal' },
      { id: 'api_predictions', name: 'API Predictions', tableName: 'api_predictions', targetTables: ['api_predictions'], endpoint: 'API-Football', refreshEndpoint: '/api/data/refresh/api-predictions', icon: Brain, description: 'External predictions', dataCategory: 'external', refreshSchedule: 'Before matches', refreshExample: 'Fetch 24hrs before kickoff', estimatedTime: '~2min', dependencies: ['fixtures'] },
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
  const { currentLeague, leagues } = useLeague()
  const [stats, setStats] = useState<Record<string, TableStats> | null>(null)

  // Multi-league selection state
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('single')
  const [selectedLeagues, setSelectedLeagues] = useState<LeagueConfig[]>([])
  const [summary, setSummary] = useState<{ totalTables: number; totalRecords: number; lastSync: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})
  const [refreshStatus, setRefreshStatus] = useState<Record<string, 'idle' | 'success' | 'error'>>({})
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    core: false,
    match: false,
    team: false,
    player: false,
    external: false,
    prediction: false,
  })
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({})
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const [oddsModalOpen, setOddsModalOpen] = useState(false)
  const [oddsSelectedRefreshing, setOddsSelectedRefreshing] = useState(false)
  const [isPreMatchRefreshing, setIsPreMatchRefreshing] = useState(false)
  const [includeRefereeStats, setIncludeRefereeStats] = useState(false)
  const [includeLineups, setIncludeLineups] = useState(false)
  const [isPostMatchRefreshing, setIsPostMatchRefreshing] = useState(false)
  const [includePostMatchLineups, setIncludePostMatchLineups] = useState(false)
  const [isSeasonSetupRefreshing, setIsSeasonSetupRefreshing] = useState(false)
  const [isWeeklyMaintenanceRefreshing, setIsWeeklyMaintenanceRefreshing] = useState(false)
  const [isSquadSyncRefreshing, setIsSquadSyncRefreshing] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const abortControllersRef = useRef<Record<string, AbortController>>({})
  const stopAllRef = useRef(false)

  // Get the target leagues based on selection mode
  const getTargetLeagues = useCallback((): LeagueConfig[] => {
    if (selectionMode === 'multiple' && selectedLeagues.length > 0) {
      return selectedLeagues
    }
    return currentLeague ? [currentLeague] : []
  }, [selectionMode, selectedLeagues, currentLeague])

  // Get display text for target leagues
  const getTargetLeaguesDisplay = useCallback((): string => {
    const targets = getTargetLeagues()
    if (targets.length === 0) return 'No league selected'
    if (targets.length === 1) return targets[0].name
    return `${targets.length} leagues`
  }, [getTargetLeagues])

  // Build league query param helper (for single league - backward compatibility)
  const getLeagueParam = useCallback(() => {
    return currentLeague?.id ? `league_id=${currentLeague.id}` : ''
  }, [currentLeague?.id])

  // Toggle league selection in multi-mode
  const toggleLeagueSelection = useCallback((league: LeagueConfig) => {
    setSelectedLeagues(prev => {
      const isSelected = prev.some(l => l.id === league.id)
      if (isSelected) {
        return prev.filter(l => l.id !== league.id)
      }
      return [...prev, league]
    })
  }, [])

  const toggleDetails = (sourceId: string) => {
    setExpandedDetails(prev => ({ ...prev, [sourceId]: !prev[sourceId] }))
  }

  // Fetch stats when league changes
  useEffect(() => {
    fetchStats()
  }, [currentLeague?.id])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const fetchStats = async () => {
    try {
      const leagueParam = currentLeague?.id ? `?league_id=${currentLeague.id}` : ''
      const res = await fetch(`/api/data/stats${leagueParam}`, { credentials: 'include' })
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

  const handleStopAll = useCallback(() => {
    stopAllRef.current = true
    addLog('warning', 'system', 'Stopping all refresh operations...')

    // Abort all ongoing requests
    Object.entries(abortControllersRef.current).forEach(([sourceId, controller]) => {
      controller.abort()
      addLog('warning', sourceId, 'Request cancelled')
    })

    // Clear all abort controllers
    abortControllersRef.current = {}

    // Reset all refreshing states
    setRefreshing({})
    setIsRefreshingAll(false)

    addLog('info', 'system', 'All refresh operations stopped')
  }, [])

  const handleRefresh = async (source: DataSource) => {
    if (!source.refreshEndpoint) return

    // Check if stop was requested
    if (stopAllRef.current) return

    // Create abort controller for this request
    const abortController = new AbortController()
    abortControllersRef.current[source.id] = abortController

    setRefreshing(prev => ({ ...prev, [source.id]: true }))
    setRefreshStatus(prev => ({ ...prev, [source.id]: 'idle' }))

    addLog('info', source.id, `Starting ${source.name.toLowerCase()} refresh...`, {
      endpoint: source.endpoint || undefined,
    })

    try {
      // Use streaming endpoint for real-time logs
      const leagueParam = currentLeague?.id ? `&league_id=${currentLeague.id}` : ''
      const res = await fetch(`${source.refreshEndpoint}?stream=true${leagueParam}`, {
        method: 'POST',
        credentials: 'include',
        signal: abortController.signal
      })

      // Check if streaming is supported (text/event-stream)
      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') && res.body) {
        // Stream mode - read logs in real-time
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.done) {
                  // Final message with summary
                  if (data.success) {
                    const duration = data.duration ? ` (${(data.duration / 1000).toFixed(1)}s)` : ''
                    // Support both old (imported) and new (inserted/updated) format
                    const stats = data.inserted !== undefined
                      ? `${data.inserted} new, ${data.updated} updated`
                      : `${data.imported} synced`
                    addLog('success', source.id, `${source.name}: ${stats}, ${data.errors} errors${duration}`)
                    setRefreshStatus(prev => ({ ...prev, [source.id]: 'success' }))
                    await fetchStats()
                  } else {
                    addLog('error', source.id, `${source.name} failed: ${data.error || 'Unknown error'}`)
                    setRefreshStatus(prev => ({ ...prev, [source.id]: 'error' }))
                  }
                } else {
                  // Real-time log entry
                  addLog(data.type || 'info', source.id, data.message, data.details)
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', line)
              }
            }
          }
        }
      } else {
        // Fallback to batch mode (non-streaming response)
        const data = await res.json()

        if (data.success) {
          if (data.logs && Array.isArray(data.logs)) {
            data.logs.forEach((log: any) => {
              addLog(log.type || 'info', source.id, log.message, log.details)
            })
          }

          const duration = data.duration ? ` (${(data.duration / 1000).toFixed(1)}s)` : ''
          // Support both old (imported) and new (inserted/updated) format
          const stats = data.inserted !== undefined
            ? `${data.inserted} new, ${data.updated} updated`
            : `${data.imported} synced`
          addLog('success', source.id, `${source.name}: ${stats}, ${data.errors} errors${duration}`)
          setRefreshStatus(prev => ({ ...prev, [source.id]: 'success' }))
          await fetchStats()
        } else {
          addLog('error', source.id, `${source.name} failed: ${data.error || 'Unknown error'}`)
          setRefreshStatus(prev => ({ ...prev, [source.id]: 'error' }))
        }
      }
    } catch (error) {
      // Handle aborted requests gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        setRefreshStatus(prev => ({ ...prev, [source.id]: 'idle' }))
        return
      }
      addLog('error', source.id, `${source.name} failed: ${error instanceof Error ? error.message : 'Network error'}`)
      setRefreshStatus(prev => ({ ...prev, [source.id]: 'error' }))
    } finally {
      // Clean up abort controller
      delete abortControllersRef.current[source.id]
      setRefreshing(prev => ({ ...prev, [source.id]: false }))
      setTimeout(() => setRefreshStatus(prev => ({ ...prev, [source.id]: 'idle' })), 3000)
    }
  }

  const handleRefreshAll = async () => {
    stopAllRef.current = false // Reset stop flag
    setIsRefreshingAll(true)
    addLog('info', 'system', 'Starting refresh of all data sources...')

    const refreshableSources = categories.flatMap(c => c.dataSources.filter(s => s.refreshEndpoint))

    for (const source of refreshableSources) {
      // Check if stop was requested before each source
      if (stopAllRef.current) {
        addLog('warning', 'system', 'Refresh sequence stopped by user')
        break
      }
      await handleRefresh(source)
    }

    if (!stopAllRef.current) {
      addLog('success', 'system', 'All data sources refreshed')
    }
    setIsRefreshingAll(false)
  }

  const handleOddsSelectedRefresh = async (fixtureIds: string[]) => {
    setOddsSelectedRefreshing(true)
    addLog('info', 'odds', `Starting odds refresh for ${fixtureIds.length} selected matches...`)

    try {
      const leagueParam = currentLeague?.id ? `&league_id=${currentLeague.id}` : ''
      const res = await fetch(`/api/data/refresh/odds?stream=true${leagueParam}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixture_ids: fixtureIds }),
      })

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.done) {
                  if (data.success) {
                    const duration = data.duration ? ` (${(data.duration / 1000).toFixed(1)}s)` : ''
                    const stats = data.inserted !== undefined
                      ? `${data.inserted} new, ${data.updated} updated`
                      : `${data.imported} synced`
                    addLog('success', 'odds', `Odds: ${stats}, ${data.errors} errors${duration}`)
                    setRefreshStatus(prev => ({ ...prev, odds: 'success' }))
                    await fetchStats()
                  } else {
                    addLog('error', 'odds', `Odds failed: ${data.error || 'Unknown error'}`)
                    setRefreshStatus(prev => ({ ...prev, odds: 'error' }))
                  }
                } else {
                  addLog(data.type || 'info', 'odds', data.message, data.details)
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', line)
              }
            }
          }
        }
      } else {
        const data = await res.json()
        if (data.success) {
          const duration = data.duration ? ` (${(data.duration / 1000).toFixed(1)}s)` : ''
          const stats = data.inserted !== undefined
            ? `${data.inserted} new, ${data.updated} updated`
            : `${data.imported} synced`
          addLog('success', 'odds', `Odds: ${stats}, ${data.errors} errors${duration}`)
          setRefreshStatus(prev => ({ ...prev, odds: 'success' }))
          await fetchStats()
        } else {
          addLog('error', 'odds', `Odds failed: ${data.error || 'Unknown error'}`)
          setRefreshStatus(prev => ({ ...prev, odds: 'error' }))
        }
      }
    } catch (error) {
      addLog('error', 'odds', `Odds failed: ${error instanceof Error ? error.message : 'Network error'}`)
      setRefreshStatus(prev => ({ ...prev, odds: 'error' }))
    } finally {
      setOddsSelectedRefreshing(false)
      setOddsModalOpen(false)
      setTimeout(() => setRefreshStatus(prev => ({ ...prev, odds: 'idle' })), 3000)
    }
  }

  const handlePreMatchRefresh = async () => {
    const targetLeagues = getTargetLeagues()
    if (targetLeagues.length === 0) return

    setIsPreMatchRefreshing(true)
    addLog('info', 'pre-match', `Starting pre-match refresh for ${targetLeagues.length} league(s)...`)

    try {
      const promises = targetLeagues.map(league =>
        runWorkflowForLeague(
          '/api/data/refresh/pre-match',
          league.id,
          league.name,
          'pre-match',
          { includeRefereeStats, includeLineups }
        )
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      if (failCount === 0) {
        addLog('success', 'pre-match', `All ${successCount} league(s) completed successfully`)
      } else {
        addLog('warning', 'pre-match', `Completed: ${successCount} succeeded, ${failCount} failed`)
      }

      await fetchStats()
    } catch (error) {
      addLog('error', 'pre-match', `Pre-match refresh failed: ${error instanceof Error ? error.message : 'Network error'}`)
    } finally {
      setIsPreMatchRefreshing(false)
    }
  }

  const handlePostMatchRefresh = async () => {
    const targetLeagues = getTargetLeagues()
    if (targetLeagues.length === 0) return

    setIsPostMatchRefreshing(true)
    addLog('info', 'post-match', `Starting post-match refresh for ${targetLeagues.length} league(s)...`)

    try {
      const promises = targetLeagues.map(league =>
        runWorkflowForLeague(
          '/api/data/refresh/post-match',
          league.id,
          league.name,
          'post-match',
          { includeLineups: includePostMatchLineups }
        )
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      if (failCount === 0) {
        addLog('success', 'post-match', `All ${successCount} league(s) completed successfully`)
      } else {
        addLog('warning', 'post-match', `Completed: ${successCount} succeeded, ${failCount} failed`)
      }

      await fetchStats()
    } catch (error) {
      addLog('error', 'post-match',
        `Post-match refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsPostMatchRefreshing(false)
    }
  }

  // Helper function to run a workflow refresh for a single league
  const runWorkflowForLeague = async (
    endpoint: string,
    leagueId: string,
    leagueName: string,
    category: string,
    body?: object
  ): Promise<{ success: boolean; league: string }> => {
    try {
      const res = await fetch(`${endpoint}?league_id=${leagueId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`)
      }

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let finalSuccess = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.done) {
                  finalSuccess = data.success
                  if (data.success) {
                    const duration = data.duration ? ` (${(data.duration / 1000).toFixed(1)}s)` : ''
                    addLog('success', category,
                      `[${leagueName}] Complete: ${data.successful}/${data.total} successful${duration}`
                    )
                  } else {
                    addLog('error', category,
                      `[${leagueName}] Completed with ${data.failed || data.errors} failures`
                    )
                  }
                } else {
                  // Real-time progress log with league prefix
                  addLog(data.type || 'info', category, `[${leagueName}] ${data.message}`, data.details)
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
        }
        return { success: finalSuccess, league: leagueName }
      } else {
        const data = await res.json()
        if (data.success) {
          addLog('success', category,
            `[${leagueName}] Completed: ${data.successful}/${data.total} successful`
          )
          return { success: true, league: leagueName }
        } else {
          addLog('error', category, `[${leagueName}] Failed: ${data.error || 'Unknown error'}`)
          return { success: false, league: leagueName }
        }
      }
    } catch (error) {
      addLog('error', category,
        `[${leagueName}] Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return { success: false, league: leagueName }
    }
  }

  const handleSeasonSetupRefresh = async () => {
    const targetLeagues = getTargetLeagues()
    if (targetLeagues.length === 0) return

    setIsSeasonSetupRefreshing(true)
    addLog('info', 'season-setup', `Starting season setup for ${targetLeagues.length} league(s)...`)

    try {
      // Run all leagues in parallel
      const promises = targetLeagues.map(league =>
        runWorkflowForLeague(
          '/api/data/refresh/season-setup',
          league.id,
          league.name,
          'season-setup'
        )
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      if (failCount === 0) {
        addLog('success', 'season-setup', `All ${successCount} league(s) completed successfully`)
      } else {
        addLog('warning', 'season-setup', `Completed: ${successCount} succeeded, ${failCount} failed`)
      }

      await fetchStats()
    } catch (error) {
      addLog('error', 'season-setup',
        `Season setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsSeasonSetupRefreshing(false)
    }
  }

  const handleWeeklyMaintenanceRefresh = async () => {
    const targetLeagues = getTargetLeagues()
    if (targetLeagues.length === 0) return

    setIsWeeklyMaintenanceRefreshing(true)
    addLog('info', 'weekly-maintenance', `Starting weekly maintenance for ${targetLeagues.length} league(s)...`)

    try {
      const promises = targetLeagues.map(league =>
        runWorkflowForLeague(
          '/api/data/refresh/weekly-maintenance',
          league.id,
          league.name,
          'weekly-maintenance'
        )
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      if (failCount === 0) {
        addLog('success', 'weekly-maintenance', `All ${successCount} league(s) completed successfully`)
      } else {
        addLog('warning', 'weekly-maintenance', `Completed: ${successCount} succeeded, ${failCount} failed`)
      }

      await fetchStats()
    } catch (error) {
      addLog('error', 'weekly-maintenance',
        `Weekly maintenance failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsWeeklyMaintenanceRefreshing(false)
    }
  }

  const handleSquadSyncRefresh = async () => {
    const targetLeagues = getTargetLeagues()
    if (targetLeagues.length === 0) return

    setIsSquadSyncRefreshing(true)
    addLog('info', 'squad-sync', `Starting squad sync for ${targetLeagues.length} league(s)...`)

    try {
      const promises = targetLeagues.map(league =>
        runWorkflowForLeague(
          '/api/data/refresh/squad-sync',
          league.id,
          league.name,
          'squad-sync'
        )
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      if (failCount === 0) {
        addLog('success', 'squad-sync', `All ${successCount} league(s) completed successfully`)
      } else {
        addLog('warning', 'squad-sync', `Completed: ${successCount} succeeded, ${failCount} failed`)
      }

      await fetchStats()
    } catch (error) {
      addLog('error', 'squad-sync',
        `Squad sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsSquadSyncRefreshing(false)
    }
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

  // Smart refresh hooks
  const { status: dataStatus, loading: statusLoading, refetch: refetchStatus } = useDataStatus(currentLeague?.id)
  const { refreshing: smartRefreshing, executeSmartRefresh, result: smartResult } = useSmartRefresh(currentLeague?.id)

  // Get phase icon
  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'live': return PlayCircle
      case 'imminent': return Clock
      case 'pre-match': return Users
      case 'matchday-morning': return Calendar
      case 'post-match': return BarChart
      case 'day-before': return Calendar
      case 'week-before': return Calendar
      case 'day-after': return CheckCircle
      default: return PauseCircle
    }
  }

  return (
    <div className="min-h-screen">
      <Header title="Data Management" subtitle={currentLeague ? `${currentLeague.name} Data` : 'Manage API data and database'} />

      <div className="p-6 space-y-6">
        {/* Smart Refresh Section */}
        {currentLeague && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">Smart Refresh</h2>
                  {dataStatus && (
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      getUrgencyClasses(dataStatus.phase.display.urgency).bg,
                      getUrgencyClasses(dataStatus.phase.display.urgency).text
                    )}>
                      {dataStatus.phase.display.title}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => refetchStatus()}
                  className="text-muted-foreground hover:text-foreground p-1"
                  title="Refresh status"
                >
                  <RefreshCw className={cn('w-4 h-4', statusLoading && 'animate-spin')} />
                </button>
              </div>
            </div>

            <div className="p-4">
              {statusLoading && !dataStatus ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading status...</span>
                </div>
              ) : dataStatus ? (
                <div className="space-y-4">
                  {/* Phase Info */}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'p-3 rounded-lg',
                      getUrgencyClasses(dataStatus.phase.display.urgency).bg
                    )}>
                      {(() => {
                        const Icon = getPhaseIcon(dataStatus.phase.current)
                        return <Icon className={cn('w-6 h-6', getUrgencyClasses(dataStatus.phase.display.urgency).text)} />
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dataStatus.phase.display.subtitle}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dataStatus.phase.recommendation.description}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Live: <span className={dataStatus.fixtures.live > 0 ? 'text-red-600 font-bold' : ''}>{dataStatus.fixtures.live}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Upcoming: <span className="font-medium">{dataStatus.fixtures.upcoming}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Missing Stats: <span className={dataStatus.fixtures.missingStats > 0 ? 'text-amber-600 font-bold' : ''}>{dataStatus.fixtures.missingStats}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Smart Refresh Button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => executeSmartRefresh()}
                      disabled={smartRefreshing || Object.values(refreshing).some(Boolean)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
                    >
                      {smartRefreshing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Running Smart Refresh...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Smart Refresh
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => executeSmartRefresh({ includeOptional: true })}
                      disabled={smartRefreshing || Object.values(refreshing).some(Boolean)}
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-sm"
                    >
                      + Include Optional
                    </button>
                  </div>

                  {/* Recommendations */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Required:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dataStatus.phase.recommendation.required.length > 0 ? (
                          dataStatus.phase.recommendation.required.map(r => (
                            <span key={r} className="px-2 py-0.5 bg-green-100 text-green-700 rounded">{r}</span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Optional:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dataStatus.phase.recommendation.optional.slice(0, 3).map(r => (
                          <span key={r} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{r}</span>
                        ))}
                        {dataStatus.phase.recommendation.optional.length > 3 && (
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded">+{dataStatus.phase.recommendation.optional.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next check:</span>
                      <div className="mt-1 font-medium">{dataStatus.phase.recommendation.nextCheckMinutes} min</div>
                    </div>
                  </div>

                  {/* Smart Refresh Result */}
                  {smartResult && (
                    <div className={cn(
                      'p-3 rounded-lg text-sm',
                      smartResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        {smartResult.success ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium">
                          {smartResult.success ? 'Smart Refresh Complete' : 'Smart Refresh Failed'}
                        </span>
                        <span className="text-muted-foreground">
                          ({(smartResult.summary.duration / 1000).toFixed(1)}s)
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        Refreshed: {smartResult.refreshed.join(', ') || 'None'} |
                        Success: {smartResult.summary.successful}/{smartResult.summary.total}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Unable to load status</p>
              )}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <TooltipProvider delayDuration={200}>
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            {/* Stats Row */}
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
            </div>

            {/* League Selection Panel */}
            <div className="border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <span className="text-sm font-medium text-muted-foreground">Target Leagues:</span>
                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setSelectionMode('single')}
                    className={cn(
                      'px-3 py-1 text-sm rounded-md transition-colors',
                      selectionMode === 'single'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => setSelectionMode('multiple')}
                    className={cn(
                      'px-3 py-1 text-sm rounded-md transition-colors',
                      selectionMode === 'multiple'
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Multiple
                  </button>
                </div>
                {selectionMode === 'single' && currentLeague && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {currentLeague.name}
                  </span>
                )}
                {selectionMode === 'multiple' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedLeagues([...leagues])}
                      className="text-xs text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      onClick={() => setSelectedLeagues([])}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear All
                    </button>
                    {selectedLeagues.length > 0 && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                        {selectedLeagues.length} selected
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Multi-league checkbox grid */}
              {selectionMode === 'multiple' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {leagues.map((league) => {
                    const isSelected = selectedLeagues.some(l => l.id === league.id)
                    return (
                      <button
                        key={league.id}
                        onClick={() => toggleLeagueSelection(league)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-background hover:border-primary/50 text-muted-foreground'
                        )}
                      >
                        <div className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="truncate">{league.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Season Setup */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSeasonSetupRefresh}
                    disabled={Object.values(refreshing).some(Boolean) || isSeasonSetupRefreshing || isPreMatchRefreshing || isPostMatchRefreshing || isWeeklyMaintenanceRefreshing || isSquadSyncRefreshing || getTargetLeagues().length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <CalendarPlus className={cn("w-4 h-4", isSeasonSetupRefreshing && "animate-pulse")} />
                    {isSeasonSetupRefreshing ? 'Running...' : `Season Setup (${getTargetLeaguesDisplay()})`}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold">Run once at season start or first-time setup</p>
                  <p className="text-xs mt-1">Populates teams, venues, fixtures, standings, managers, and squad rosters.</p>
                  <p className="text-xs text-muted-foreground mt-1">~5-10 min</p>
                </TooltipContent>
              </Tooltip>

              {/* Pre-Match */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handlePreMatchRefresh}
                    disabled={Object.values(refreshing).some(Boolean) || isSeasonSetupRefreshing || isPreMatchRefreshing || isPostMatchRefreshing || isWeeklyMaintenanceRefreshing || isSquadSyncRefreshing || getTargetLeagues().length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <Zap className={cn("w-4 h-4", isPreMatchRefreshing && "animate-pulse")} />
                    {isPreMatchRefreshing ? 'Running...' : `Matchday Prep (${getTargetLeaguesDisplay()})`}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold">Run 3-4 hours before first match</p>
                  <p className="text-xs mt-1">Updates standings, injuries, team stats, H2H, weather, and odds. Essential before generating predictions.</p>
                  <p className="text-xs text-muted-foreground mt-1">~3-5 min</p>
                </TooltipContent>
              </Tooltip>

              {/* Post-Match */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handlePostMatchRefresh}
                    disabled={Object.values(refreshing).some(Boolean) || isSeasonSetupRefreshing || isPreMatchRefreshing || isPostMatchRefreshing || isWeeklyMaintenanceRefreshing || isSquadSyncRefreshing || getTargetLeagues().length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <CheckCircle className={cn("w-4 h-4", isPostMatchRefreshing && "animate-pulse")} />
                    {isPostMatchRefreshing ? 'Running...' : `Post-Match Sync (${getTargetLeaguesDisplay()})`}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold">Run 1-2 hours after matches finish</p>
                  <p className="text-xs mt-1">Syncs results, detailed statistics (shots, xG), events (goals, cards), lineups, and updates standings.</p>
                  <p className="text-xs text-muted-foreground mt-1">~2-3 min</p>
                </TooltipContent>
              </Tooltip>

              {/* Weekly Stats */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleWeeklyMaintenanceRefresh}
                    disabled={Object.values(refreshing).some(Boolean) || isSeasonSetupRefreshing || isPreMatchRefreshing || isPostMatchRefreshing || isWeeklyMaintenanceRefreshing || isSquadSyncRefreshing || getTargetLeagues().length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <BarChart3 className={cn("w-4 h-4", isWeeklyMaintenanceRefreshing && "animate-pulse")} />
                    {isWeeklyMaintenanceRefreshing ? 'Running...' : `Weekly Stats (${getTargetLeaguesDisplay()})`}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold">Run every Sunday afternoon</p>
                  <p className="text-xs mt-1">Refreshes team stats, player stats, top performers, referee tendencies, and H2H history.</p>
                  <p className="text-xs text-muted-foreground mt-1">~10-15 min</p>
                </TooltipContent>
              </Tooltip>

              {/* Squad Sync */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSquadSyncRefresh}
                    disabled={Object.values(refreshing).some(Boolean) || isSeasonSetupRefreshing || isPreMatchRefreshing || isPostMatchRefreshing || isWeeklyMaintenanceRefreshing || isSquadSyncRefreshing || getTargetLeagues().length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    <UsersRound className={cn("w-4 h-4", isSquadSyncRefreshing && "animate-pulse")} />
                    {isSquadSyncRefreshing ? 'Running...' : `Squad Sync (${getTargetLeaguesDisplay()})`}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-semibold">Run during transfer windows or squad changes</p>
                  <p className="text-xs mt-1">Updates squad rosters, recent transfers, injury status, and manager changes.</p>
                  <p className="text-xs text-muted-foreground mt-1">~2-3 min</p>
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-2 ml-auto">
                {/* Stop Button */}
                {(Object.values(refreshing).some(Boolean) || isPreMatchRefreshing || isPostMatchRefreshing || isSeasonSetupRefreshing || isWeeklyMaintenanceRefreshing || isSquadSyncRefreshing) && (
                  <button
                    onClick={handleStopAll}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Stop
                  </button>
                )}

                {/* Refresh All */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleRefreshAll}
                      disabled={Object.values(refreshing).some(Boolean) || isSeasonSetupRefreshing || isPreMatchRefreshing || isPostMatchRefreshing || isWeeklyMaintenanceRefreshing || isSquadSyncRefreshing}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      <RefreshCw className={cn("w-4 h-4", Object.values(refreshing).some(Boolean) && "animate-spin")} />
                      Refresh All
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold">Refresh all 19 endpoints sequentially</p>
                    <p className="text-xs mt-1 text-amber-500">Warning: Takes a long time and uses many API calls. Use specific buttons instead.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Endpoint Details - Collapsible sections */}
            <div className="border-t border-border pt-3 space-y-3">
              {/* Pre-Match Options */}
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Matchday Prep:
                  </span>
                  <code className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">standings</code>
                  <code className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">injuries</code>
                  <code className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">team-stats</code>
                  <code className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">head-to-head</code>
                  <code className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">fixture-statistics</code>
                  <code className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">weather</code>
                  <code className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">odds</code>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeRefereeStats}
                      onChange={(e) => setIncludeRefereeStats(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-muted-foreground">+ <code className="text-xs bg-muted px-2 py-0.5 rounded">referee-stats</code></span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLineups}
                      onChange={(e) => setIncludeLineups(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-muted-foreground">+ <code className="text-xs bg-muted px-2 py-0.5 rounded">lineups</code> <span className="text-xs">(~1hr before)</span></span>
                  </label>
                </div>
              </div>

              {/* Post-Match Options */}
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Post-Match Sync:
                  </span>
                  <code className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">fixtures?recent_only</code>
                  <code className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">fixture-statistics?recent_only</code>
                  <code className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">fixture-events?recent_only</code>
                  <code className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">standings</code>
                </div>
                <div className="ml-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePostMatchLineups}
                      onChange={(e) => setIncludePostMatchLineups(e.target.checked)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-muted-foreground">+ <code className="text-xs bg-muted px-2 py-0.5 rounded">lineups?recent_only</code></span>
                  </label>
                </div>
              </div>

              {/* Season Setup */}
              <div className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <CalendarPlus className="w-3 h-3 text-blue-500" />
                    Season Setup:
                  </span>
                  <code className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">teams</code>
                  <code className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">fixtures</code>
                  <code className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">standings</code>
                  <code className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">team-stats</code>
                  <code className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">coaches</code>
                  <code className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">player-squads</code>
                </div>
              </div>

              {/* Weekly Stats */}
              <div className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-purple-500" />
                    Weekly Stats:
                  </span>
                  <code className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">team-stats</code>
                  <code className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">player-stats</code>
                  <code className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">top-performers</code>
                  <code className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">referee-stats</code>
                  <code className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">head-to-head</code>
                </div>
              </div>

              {/* Squad Sync */}
              <div className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <UsersRound className="w-3 h-3 text-cyan-500" />
                    Squad Sync:
                  </span>
                  <code className="text-xs bg-cyan-500/10 text-cyan-600 px-2 py-0.5 rounded">player-squads</code>
                  <code className="text-xs bg-cyan-500/10 text-cyan-600 px-2 py-0.5 rounded">transfers</code>
                  <code className="text-xs bg-cyan-500/10 text-cyan-600 px-2 py-0.5 rounded">injuries</code>
                  <code className="text-xs bg-cyan-500/10 text-cyan-600 px-2 py-0.5 rounded">coaches</code>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>

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
                        const catStyle = categoryStyles[source.dataCategory]

                        // Check dependencies
                        const missingDeps = source.dependencies?.filter(dep => {
                          const depStats = stats?.[dep]
                          return !depStats || depStats.count === 0
                        }) || []

                        return (
                          <div
                            key={source.id}
                            className="bg-muted/30 rounded-lg p-4 space-y-3"
                          >
                            {/* Header with badges */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Icon className="w-4 h-4 text-primary shrink-0" />
                                <div className="min-w-0">
                                  <h4 className="font-medium text-sm">{source.name}</h4>
                                  <p className="text-xs text-muted-foreground truncate">{source.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", catStyle.bg, catStyle.color)}>
                                  {catStyle.label}
                                </span>
                                {source.estimatedTime && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {source.estimatedTime}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Table badge */}
                            <div className="flex flex-wrap gap-1">
                              {source.targetTables.map(table => (
                                <span key={table} className="text-[10px] font-mono bg-background border border-border px-1.5 py-0.5 rounded">
                                  📋 {table}
                                </span>
                              ))}
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

                            {/* Refresh Schedule Info */}
                            <div className="text-[11px] space-y-1 border-t border-border pt-2">
                              <div className="flex items-start gap-1.5">
                                <span className="text-muted-foreground">📅</span>
                                <span className="text-muted-foreground">{source.refreshSchedule}</span>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <span className="text-muted-foreground">💡</span>
                                <span className="text-muted-foreground italic">{source.refreshExample}</span>
                              </div>
                            </div>

                            {/* Dependency Warning */}
                            {missingDeps.length > 0 && (
                              <div className="flex items-start gap-1.5 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>Requires: {missingDeps.join(', ')} (missing data)</span>
                              </div>
                            )}

                            {/* Refresh Button(s) */}
                            {canRefresh && source.id === 'odds' ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRefresh(source)}
                                  disabled={isRefreshing || missingDeps.length > 0}
                                  className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                                    status === 'success' && "bg-green-500/20 text-green-500",
                                    status === 'error' && "bg-red-500/20 text-red-500",
                                    status === 'idle' && !missingDeps.length && "bg-primary/10 text-primary hover:bg-primary/20",
                                    status === 'idle' && missingDeps.length > 0 && "bg-muted text-muted-foreground cursor-not-allowed",
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
                                    <><RefreshCw className="w-3 h-3" /> Refresh All</>
                                  )}
                                </button>
                                <button
                                  onClick={() => setOddsModalOpen(true)}
                                  disabled={isRefreshing || missingDeps.length > 0}
                                  className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                                    !missingDeps.length && "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
                                    missingDeps.length > 0 && "bg-muted text-muted-foreground cursor-not-allowed",
                                    isRefreshing && "opacity-70"
                                  )}
                                >
                                  <Calendar className="w-3 h-3" /> Select Matches
                                </button>
                              </div>
                            ) : canRefresh && (
                              <button
                                onClick={() => handleRefresh(source)}
                                disabled={isRefreshing || missingDeps.length > 0}
                                className={cn(
                                  "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                                  status === 'success' && "bg-green-500/20 text-green-500",
                                  status === 'error' && "bg-red-500/20 text-red-500",
                                  status === 'idle' && !missingDeps.length && "bg-primary/10 text-primary hover:bg-primary/20",
                                  status === 'idle' && missingDeps.length > 0 && "bg-muted text-muted-foreground cursor-not-allowed",
                                  isRefreshing && "opacity-70"
                                )}
                              >
                                {isRefreshing ? (
                                  <><Loader2 className="w-3 h-3 animate-spin" /> Refreshing...</>
                                ) : status === 'success' ? (
                                  <><Check className="w-3 h-3" /> Updated!</>
                                ) : status === 'error' ? (
                                  <><X className="w-3 h-3" /> Failed</>
                                ) : missingDeps.length > 0 ? (
                                  <><AlertTriangle className="w-3 h-3" /> Missing Dependencies</>
                                ) : (
                                  <><RefreshCw className="w-3 h-3" /> Refresh</>
                                )}
                              </button>
                            )}

                            {/* Technical Details Panel */}
                            {DATA_SOURCE_DOCS[source.id] && (
                              <DataSourceDetails
                                doc={DATA_SOURCE_DOCS[source.id]}
                                isExpanded={expandedDetails[source.id] || false}
                                onToggle={() => toggleDetails(source.id)}
                              />
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
            <div className="flex items-center gap-2">
              {/* Stop button - visible when any refresh is in progress */}
              {(Object.values(refreshing).some(Boolean) || isPreMatchRefreshing || isPostMatchRefreshing || isSeasonSetupRefreshing || isWeeklyMaintenanceRefreshing || isSquadSyncRefreshing) && (
                <button
                  onClick={handleStopAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop
                </button>
              )}
              <button
                onClick={clearLogs}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
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

      {/* Odds Match Selector Modal */}
      <OddsMatchSelector
        isOpen={oddsModalOpen}
        onClose={() => setOddsModalOpen(false)}
        onRefresh={handleOddsSelectedRefresh}
        isRefreshing={oddsSelectedRefreshing}
        leagueId={currentLeague?.id}
      />
    </div>
  )
}
