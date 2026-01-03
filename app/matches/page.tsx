'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import Link from 'next/link'
import { useLeague } from '@/contexts/league-context'
import {
  Search,
  Calendar,
  Clock,
  Trophy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  X,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'live' | 'upcoming' | 'results'
type SortType = 'date-asc' | 'date-desc' | 'home-team' | 'away-team'

const ITEMS_PER_PAGE = 20

interface Fixture {
  id: string
  match_date: string
  status: string
  round: string
  goals_home: number | null
  goals_away: number | null
  home_team: { id: string; name: string; logo: string } | null
  away_team: { id: string; name: string; logo: string } | null
  venue: { name: string; city: string } | null
  prediction?: {
    prediction_result: string
    overall_index: number
    certainty_score?: number
    confidence_pct?: number
  } | null
}

export default function MatchesPage() {
  const { currentLeague } = useLeague()
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedRounds, setSelectedRounds] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SortType>('date-asc')
  const [showFilters, setShowFilters] = useState(false)
  const [showRoundDropdown, setShowRoundDropdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const [liveMatches, setLiveMatches] = useState<Fixture[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<Fixture[]>([])
  const [results, setResults] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const liveMatchIdsRef = useRef<Set<string>>(new Set())

  // Fetch matches
  useEffect(() => {
    const fetchMatches = async () => {
      if (!currentLeague?.id) return

      setLoading(true)
      try {
        const [liveRes, upcomingRes, resultsRes] = await Promise.all([
          fetch(`/api/fixtures/live?league_id=${currentLeague.id}`),
          fetch(`/api/fixtures/upcoming?limit=500&league_id=${currentLeague.id}`),
          fetch(`/api/fixtures/recent-results?rounds=all&league_id=${currentLeague.id}`),
        ])

        const [live, upcoming, recent] = await Promise.all([
          liveRes.json(),
          upcomingRes.json(),
          resultsRes.json(),
        ])

        const liveArray = Array.isArray(live) ? live : []
        setLiveMatches(liveArray)
        liveMatchIdsRef.current = new Set(liveArray.map((m: Fixture) => m.id))
        setUpcomingMatches(Array.isArray(upcoming) ? upcoming : [])
        setResults(Array.isArray(recent) ? recent : [])
      } catch (error) {
        console.error('Error fetching matches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()

    // Auto-refresh live matches every 60 seconds
    // Also check if any matches finished and need to move to results
    const interval = setInterval(async () => {
      if (!currentLeague?.id) return

      try {
        // Always fetch live matches to detect status changes
        const liveRes = await fetch(`/api/fixtures/live?league_id=${currentLeague.id}`)
        const newLiveData = await liveRes.json()
        const newLiveMatches = Array.isArray(newLiveData) ? newLiveData : []

        // Check if any previously live matches are no longer live (finished)
        const currentLiveIds = new Set(newLiveMatches.map((m: Fixture) => m.id))
        const hasFinishedMatches = Array.from(liveMatchIdsRef.current).some(id => !currentLiveIds.has(id))

        // Update ref with current live match IDs
        liveMatchIdsRef.current = currentLiveIds
        setLiveMatches(newLiveMatches)

        // If matches finished, trigger a fixtures refresh to update statuses in DB
        // Then refresh results to include them
        if (hasFinishedMatches) {
          // Trigger backend refresh to update fixture statuses from API
          await fetch(`/api/data/refresh/fixtures?mode=live&league_id=${currentLeague.id}`, {
            method: 'POST',
            credentials: 'include'
          }).catch(() => {}) // Ignore errors, just try to refresh

          // Then fetch updated results
          const resultsRes = await fetch(`/api/fixtures/recent-results?rounds=all&league_id=${currentLeague.id}`)
          const resultsData = await resultsRes.json()
          setResults(Array.isArray(resultsData) ? resultsData : [])
        }
      } catch (error) {
        console.error('Error refreshing matches:', error)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [currentLeague?.id])

  // Debounce search query to reduce re-renders during typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset to first page when filters or tab changes
  useEffect(() => {
    setCurrentPage(0)
  }, [activeTab, debouncedSearchQuery, selectedRounds, sortBy])

  // Get current matches based on active tab
  const currentMatches = useMemo(() => {
    switch (activeTab) {
      case 'live':
        return liveMatches
      case 'upcoming':
        return upcomingMatches
      case 'results':
        return results
      default:
        return []
    }
  }, [activeTab, liveMatches, upcomingMatches, results])

  // Get unique rounds for filter
  const availableRounds = useMemo(() => {
    const rounds = new Set<string>()
    currentMatches.forEach((m) => {
      if (m.round) rounds.add(m.round)
    })
    return Array.from(rounds).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0
      const numB = parseInt(b.replace(/\D/g, '')) || 0
      return numA - numB
    })
  }, [currentMatches])

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let filtered = [...currentMatches]

    // Search filter (uses debounced value for performance)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.home_team?.name?.toLowerCase().includes(query) ||
          m.away_team?.name?.toLowerCase().includes(query)
      )
    }

    // Round filter (multi-select)
    if (selectedRounds.size > 0) {
      filtered = filtered.filter((m) => m.round && selectedRounds.has(m.round))
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        case 'date-desc':
          return new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
        case 'home-team':
          return (a.home_team?.name || '').localeCompare(b.home_team?.name || '')
        case 'away-team':
          return (a.away_team?.name || '').localeCompare(b.away_team?.name || '')
        default:
          return 0
      }
    })

    return filtered
  }, [currentMatches, debouncedSearchQuery, selectedRounds, sortBy])

  // Paginate filtered matches
  const totalPages = Math.ceil(filteredMatches.length / ITEMS_PER_PAGE)
  const paginatedMatches = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE
    return filteredMatches.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredMatches, currentPage])

  // Get prediction badge color
  const getPredictionBadge = (prediction: Fixture['prediction']) => {
    if (!prediction) return null
    const result = prediction.prediction_result
    const confidence = prediction.certainty_score || prediction.confidence_pct || prediction.overall_index || 0

    let bgColor = 'bg-muted'
    if (result === '1') bgColor = 'bg-blue-500'
    else if (result === 'X') bgColor = 'bg-amber-500'
    else if (result === '2') bgColor = 'bg-orange-500'
    else if (result === '1X' || result === 'X2' || result === '12') bgColor = 'bg-purple-500'

    return (
      <div className="flex items-center gap-1.5">
        <span className={cn('text-xs font-bold text-white px-1.5 py-0.5 rounded', bgColor)}>
          {result}
        </span>
        <span className="text-xs text-muted-foreground">{confidence}%</span>
      </div>
    )
  }

  // Check if prediction was correct (for results)
  const isPredictionCorrect = (fixture: Fixture) => {
    if (!fixture.prediction || fixture.goals_home === null || fixture.goals_away === null) return null

    const predicted = fixture.prediction.prediction_result
    let actual: string
    if (fixture.goals_home > fixture.goals_away) actual = '1'
    else if (fixture.goals_home < fixture.goals_away) actual = '2'
    else actual = 'X'

    // Check compound predictions
    if (predicted === actual) return true
    if (predicted.includes(actual)) return true
    return false
  }

  // Get live status display
  const getLiveStatus = (status: string) => {
    switch (status) {
      case '1H':
        return '1st Half'
      case '2H':
        return '2nd Half'
      case 'HT':
        return 'Half Time'
      case 'ET':
        return 'Extra Time'
      case 'BT':
        return 'Break'
      case 'P':
        return 'Penalties'
      default:
        return 'Live'
    }
  }

  const tabs = [
    { id: 'live' as TabType, label: 'Live', icon: Clock, count: liveMatches.length },
    { id: 'upcoming' as TabType, label: 'Upcoming', icon: Calendar, count: upcomingMatches.length },
    { id: 'results' as TabType, label: 'Results', icon: Trophy, count: results.length },
  ]

  return (
    <div className="min-h-screen">
      <Header title="Matches" subtitle={currentLeague?.name} />

      <div className="p-4 md:p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const hasLive = tab.id === 'live' && tab.count > 0

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  // Set appropriate sort order for each tab
                  if (tab.id === 'results') {
                    setSortBy('date-desc')
                  } else {
                    setSortBy('date-asc')
                  }
                  setSelectedRounds(new Set())
                }}
                role="tab"
                aria-selected={isActive}
                aria-label={`${tab.label} matches (${tab.count})`}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border hover:bg-muted'
                )}
              >
                {hasLive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                <Icon className="w-4 h-4" />
                {tab.label}
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs',
                    isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search teams by name"
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle match filters"
            aria-expanded={showFilters}
            className="sm:hidden flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(selectedRounds.size > 0 || (activeTab === 'results' ? sortBy !== 'date-desc' : sortBy !== 'date-asc')) && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>

          {/* Desktop Filters */}
          <div className="hidden sm:flex gap-3">
            {/* Round Filter - Multi-select dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoundDropdown(!showRoundDropdown)}
                aria-label="Filter by round"
                aria-expanded={showRoundDropdown}
                aria-haspopup="listbox"
                className="flex items-center gap-2 pl-3 pr-8 py-2 bg-card border border-border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                {selectedRounds.size === 0
                  ? 'All Rounds'
                  : selectedRounds.size === 1
                    ? Array.from(selectedRounds)[0]?.replace('Regular Season - ', 'R')
                    : `${selectedRounds.size} Rounds`}
              </button>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                aria-label="Sort matches by"
                className="appearance-none pl-3 pr-8 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                <option value="date-desc">Date (Latest)</option>
                <option value="date-asc">Date (Earliest)</option>
                <option value="home-team">Home Team (A-Z)</option>
                <option value="away-team">Away Team (A-Z)</option>
              </select>
              <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Round Multi-Select Dropdown (Desktop) */}
        {showRoundDropdown && (
          <div className="hidden sm:block bg-card border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filter by Round</span>
              <div className="flex items-center gap-2">
                {selectedRounds.size > 0 && (
                  <button
                    onClick={() => setSelectedRounds(new Set())}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setShowRoundDropdown(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableRounds.map((round) => {
                const isSelected = selectedRounds.has(round)
                const displayRound = round.replace('Regular Season - ', 'R')
                return (
                  <button
                    key={round}
                    onClick={() => {
                      const newSet = new Set(selectedRounds)
                      if (isSelected) {
                        newSet.delete(round)
                      } else {
                        newSet.add(round)
                      }
                      setSelectedRounds(newSet)
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {displayRound}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Mobile Filters Dropdown */}
        {showFilters && (
          <div className="sm:hidden bg-card border border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filter by Round</span>
              {selectedRounds.size > 0 && (
                <button
                  onClick={() => setSelectedRounds(new Set())}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableRounds.map((round) => {
                const isSelected = selectedRounds.has(round)
                const displayRound = round.replace('Regular Season - ', 'R')
                return (
                  <button
                    key={round}
                    onClick={() => {
                      const newSet = new Set(selectedRounds)
                      if (isSelected) {
                        newSet.delete(round)
                      } else {
                        newSet.add(round)
                      }
                      setSelectedRounds(newSet)
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {displayRound}
                  </button>
                )
              })}
            </div>
            {/* Mobile sort option */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sort by</span>
              </div>
              <div className="relative mt-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  aria-label="Sort matches by"
                  className="w-full appearance-none pl-3 pr-8 py-2 bg-muted border-0 rounded-lg text-sm"
                >
                  <option value="date-desc">Date (Latest)</option>
                  <option value="date-asc">Date (Earliest)</option>
                  <option value="home-team">Home Team</option>
                  <option value="away-team">Away Team</option>
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        {(searchQuery || selectedRounds.size > 0) && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredMatches.length} of {currentMatches.length} matches
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedRounds(new Set())
              }}
              className="ml-2 text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Matches List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              Loading matches...
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery || selectedRounds.size > 0
                ? 'No matches found with current filters'
                : activeTab === 'live'
                ? 'No live matches at the moment'
                : activeTab === 'upcoming'
                ? 'No upcoming matches'
                : 'No recent results'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedMatches.map((fixture) => {
                const isLive = activeTab === 'live'
                const isResult = activeTab === 'results'
                const predictionCorrect = isResult ? isPredictionCorrect(fixture) : null

                return (
                  <Link
                    key={fixture.id}
                    href={`/matches/${fixture.id}`}
                    className="block p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Date/Time or Live Status */}
                      <div className="flex items-center gap-3 sm:min-w-[100px]">
                        {isLive ? (
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-xs font-medium text-red-500">
                              {getLiveStatus(fixture.status)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">
                              {new Date(fixture.match_date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </div>
                            {!isResult && (
                              <div className="text-sm font-medium">
                                {new Date(fixture.match_date).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Teams and Score */}
                      <div className="flex items-center gap-3 flex-1">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span
                            className={cn(
                              'font-medium text-sm sm:text-base text-right truncate',
                              isResult &&
                                (fixture.goals_home ?? 0) <= (fixture.goals_away ?? 0) &&
                                'text-muted-foreground'
                            )}
                          >
                            {fixture.home_team?.name || 'TBD'}
                          </span>
                          {fixture.home_team?.logo && (
                            <img
                              src={fixture.home_team.logo}
                              alt=""
                              className="w-8 h-8 object-contain shrink-0"
                            />
                          )}
                        </div>

                        {/* Score or VS */}
                        <div
                          className={cn(
                            'px-3 py-1.5 rounded text-sm font-bold min-w-[60px] text-center shrink-0',
                            isLive ? 'bg-red-500/10 text-red-600' : 'bg-muted'
                          )}
                        >
                          {isLive || isResult
                            ? `${fixture.goals_home ?? 0} - ${fixture.goals_away ?? 0}`
                            : 'vs'}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2 flex-1">
                          {fixture.away_team?.logo && (
                            <img
                              src={fixture.away_team.logo}
                              alt=""
                              className="w-8 h-8 object-contain shrink-0"
                            />
                          )}
                          <span
                            className={cn(
                              'font-medium text-sm sm:text-base truncate',
                              isResult &&
                                (fixture.goals_away ?? 0) <= (fixture.goals_home ?? 0) &&
                                'text-muted-foreground'
                            )}
                          >
                            {fixture.away_team?.name || 'TBD'}
                          </span>
                        </div>
                      </div>

                      {/* Prediction & Round */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:min-w-[140px]">
                        {/* Prediction Badge */}
                        {fixture.prediction && (
                          <div className="flex items-center gap-1.5">
                            {isResult && predictionCorrect !== null && (
                              predictionCorrect ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )
                            )}
                            {!isResult && <Target className="w-3.5 h-3.5 text-muted-foreground" />}
                            {getPredictionBadge(fixture.prediction)}
                          </div>
                        )}

                        {/* Round */}
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {fixture.round?.replace('Regular Season - ', 'R')}
                        </span>
                      </div>
                    </div>

                    {/* Mobile: Round */}
                    <div className="mt-2 text-xs text-muted-foreground sm:hidden">
                      {fixture.round}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredMatches.length)} of {filteredMatches.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                aria-label="Previous page"
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentPage === 0
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i
                  } else if (currentPage < 3) {
                    pageNum = i
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 5 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      aria-label={`Page ${pageNum + 1}`}
                      aria-current={currentPage === pageNum ? 'page' : undefined}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {pageNum + 1}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                aria-label="Next page"
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentPage >= totalPages - 1
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
