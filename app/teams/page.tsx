'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { TeamCard } from '@/components/teams/team-card'
import { DataFreshnessBadge } from '@/components/updates/data-freshness-badge'
import { useLeague } from '@/contexts/league-context'
import { Loader2, Search, Filter, Trophy, Target, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

type SortOption = 'rank' | 'goals' | 'defense' | 'name' | 'form'

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [standings, setStandings] = useState<any[]>([])
  const [injuries, setInjuries] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('rank')
  const { currentLeague } = useLeague()

  useEffect(() => {
    fetchData()
  }, [currentLeague?.id])

  const fetchData = async () => {
    try {
      const params = currentLeague?.id ? `?league_id=${currentLeague.id}` : ''
      const [teamsRes, standingsRes] = await Promise.all([
        fetch(`/api/teams${params}`),
        fetch(`/api/standings${params}`),
      ])

      const teamsData = await teamsRes.json()
      const standingsData = await standingsRes.json()

      setTeams(teamsData)
      setStandings(standingsData)

      // Fetch injury counts per team
      const injuryRes = await fetch(`/api/injuries${params}`)
      const injuryData = await injuryRes.json()

      const injuryCounts: Record<string, number> = {}
      injuryData.forEach((injury: any) => {
        const teamId = injury.team_id
        injuryCounts[teamId] = (injuryCounts[teamId] || 0) + 1
      })
      setInjuries(injuryCounts)
    } catch (error) {
      console.error('Failed to fetch teams data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create standings map
  const standingsMap = new Map(standings.map((s: any) => [s.team_id, s]))

  // Filter and sort teams
  const filteredTeams = teams
    .filter((team: any) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.code && team.code.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a: any, b: any) => {
      const standingA = standingsMap.get(a.id)
      const standingB = standingsMap.get(b.id)

      switch (sortBy) {
        case 'rank':
          return (standingA?.rank || 99) - (standingB?.rank || 99)
        case 'goals':
          return (standingB?.goals_for || 0) - (standingA?.goals_for || 0)
        case 'defense':
          return (standingA?.goals_against || 0) - (standingB?.goals_against || 0)
        case 'name':
          return a.name.localeCompare(b.name)
        case 'form':
          // Count wins in last 5 matches
          const formA = standingA?.form?.slice(0, 5).split('').filter((r: string) => r === 'W').length || 0
          const formB = standingB?.form?.slice(0, 5).split('').filter((r: string) => r === 'W').length || 0
          return formB - formA
        default:
          return 0
      }
    })

  // Calculate league stats
  const totalGoals = standings.reduce((sum, s) => sum + (s.goals_for || 0), 0)
  const avgGoalsPerTeam = teams.length > 0 ? (totalGoals / teams.length).toFixed(1) : '0'
  const topScorer = standings.sort((a, b) => (b.goals_for || 0) - (a.goals_for || 0))[0]
  const bestDefense = standings.sort((a, b) => (a.goals_against || 0) - (b.goals_against || 0))[0]

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Teams" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header title="Teams" />

      <div className="p-6 space-y-6">
        {/* Data freshness */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Data:</span>
          <DataFreshnessBadge category="standings" size="sm" showInfo />
          <DataFreshnessBadge category="injuries" size="sm" showInfo />
        </div>

        {/* League Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs">Teams</span>
            </div>
            <p className="text-2xl font-bold">{teams.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs">Total Goals</span>
            </div>
            <p className="text-2xl font-bold">{totalGoals}</p>
            <p className="text-xs text-muted-foreground">{avgGoalsPerTeam} avg/team</p>
          </div>
          {topScorer && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-xs">Top Scorers</span>
              </div>
              <p className="font-bold truncate">{teams.find(t => t.id === topScorer.team_id)?.name}</p>
              <p className="text-xs text-green-500">{topScorer.goals_for} goals</p>
            </div>
          )}
          {bestDefense && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-xs">Best Defense</span>
              </div>
              <p className="font-bold truncate">{teams.find(t => t.id === bestDefense.team_id)?.name}</p>
              <p className="text-xs text-blue-500">{bestDefense.goals_against} conceded</p>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            {([
              { value: 'rank', label: 'Position' },
              { value: 'goals', label: 'Goals' },
              { value: 'defense', label: 'Defense' },
              { value: 'form', label: 'Form' },
              { value: 'name', label: 'A-Z' },
            ] as { value: SortOption; label: string }[]).map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap",
                  sortBy === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTeams.map((team: any) => {
            const standing = standingsMap.get(team.id)
            return (
              <TeamCard
                key={team.id}
                team={team}
                standing={standing}
                injuryCount={injuries[team.id] || 0}
              />
            )
          })}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No teams found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>
    </div>
  )
}
