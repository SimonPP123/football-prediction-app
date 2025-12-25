'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Loader2 } from 'lucide-react'

export default function StandingsPage() {
  const [standings, setStandings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStandings()
  }, [])

  const fetchStandings = async () => {
    try {
      const res = await fetch('/api/standings')
      const data = await res.json()
      setStandings(data)
    } catch (error) {
      console.error('Failed to fetch standings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPositionStyle = (rank: number, description: string | null) => {
    if (rank <= 4) return 'border-l-4 border-l-blue-500' // Champions League
    if (rank === 5) return 'border-l-4 border-l-orange-500' // Europa League
    if (rank >= 18) return 'border-l-4 border-l-red-500' // Relegation
    return ''
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Standings" subtitle="Premier League 2025-2026" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header title="Standings" subtitle="Premier League 2025-2026" />

      <div className="p-6">
        {/* Legend */}
        <div className="flex gap-4 text-xs mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>Champions League</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span>Europa League</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Relegation</span>
          </div>
        </div>

        {/* Standings Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left p-3 w-12">#</th>
                  <th className="text-left p-3">Team</th>
                  <th className="text-center p-3">P</th>
                  <th className="text-center p-3">W</th>
                  <th className="text-center p-3">D</th>
                  <th className="text-center p-3">L</th>
                  <th className="text-center p-3">GF</th>
                  <th className="text-center p-3">GA</th>
                  <th className="text-center p-3">GD</th>
                  <th className="text-center p-3">Pts</th>
                  <th className="text-center p-3">Form</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      Standings not available
                    </td>
                  </tr>
                ) : (
                  standings.map((standing: any) => (
                    <tr
                      key={standing.id}
                      className={`border-t border-border hover:bg-muted/30 transition-colors ${getPositionStyle(standing.rank, standing.description)}`}
                    >
                      <td className="p-3 font-bold">{standing.rank}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {standing.team?.logo && (
                            <img
                              src={standing.team.logo}
                              alt={standing.team.name}
                              className="w-6 h-6 object-contain"
                            />
                          )}
                          <span className="font-medium">
                            {standing.team?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">{standing.played}</td>
                      <td className="p-3 text-center text-green-500 font-medium">{standing.won}</td>
                      <td className="p-3 text-center text-muted-foreground">{standing.drawn}</td>
                      <td className="p-3 text-center text-red-500">{standing.lost}</td>
                      <td className="p-3 text-center">{standing.goals_for}</td>
                      <td className="p-3 text-center">{standing.goals_against}</td>
                      <td className="p-3 text-center">
                        <span className={standing.goal_diff > 0 ? 'text-green-500' : standing.goal_diff < 0 ? 'text-red-500' : ''}>
                          {standing.goal_diff > 0 ? '+' : ''}{standing.goal_diff}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-lg">{standing.points}</td>
                      <td className="p-3">
                        {standing.form && (
                          <div className="flex gap-1 justify-center">
                            {standing.form.split('').slice(0, 5).map((result: string, i: number) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  result === 'W' ? 'bg-green-500' :
                                  result === 'D' ? 'bg-gray-500' :
                                  result === 'L' ? 'bg-red-500' : 'bg-muted'
                                }`}
                              >
                                {result}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Home/Away Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Home Table */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Home Form</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2">W</th>
                    <th className="text-center p-2">D</th>
                    <th className="text-center p-2">L</th>
                    <th className="text-center p-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings
                    .filter((s: any) => s.home_record)
                    .sort((a: any, b: any) => {
                      const aHome = a.home_record || {}
                      const bHome = b.home_record || {}
                      const aPts = (aHome.win || 0) * 3 + (aHome.draw || 0)
                      const bPts = (bHome.win || 0) * 3 + (bHome.draw || 0)
                      return bPts - aPts
                    })
                    .slice(0, 10)
                    .map((standing: any, idx: number) => {
                      const home = standing.home_record || {}
                      const pts = (home.win || 0) * 3 + (home.draw || 0)
                      return (
                        <tr key={standing.id} className="border-t border-border">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {standing.team?.logo && (
                                <img src={standing.team.logo} alt="" className="w-4 h-4" />
                              )}
                              <span className="truncate max-w-[100px]">{standing.team?.name}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">{home.played || 0}</td>
                          <td className="p-2 text-center text-green-500">{home.win || 0}</td>
                          <td className="p-2 text-center">{home.draw || 0}</td>
                          <td className="p-2 text-center text-red-500">{home.lose || 0}</td>
                          <td className="p-2 text-center font-bold">{pts}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Away Table */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Away Form</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2">W</th>
                    <th className="text-center p-2">D</th>
                    <th className="text-center p-2">L</th>
                    <th className="text-center p-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings
                    .filter((s: any) => s.away_record)
                    .sort((a: any, b: any) => {
                      const aAway = a.away_record || {}
                      const bAway = b.away_record || {}
                      const aPts = (aAway.win || 0) * 3 + (aAway.draw || 0)
                      const bPts = (bAway.win || 0) * 3 + (bAway.draw || 0)
                      return bPts - aPts
                    })
                    .slice(0, 10)
                    .map((standing: any, idx: number) => {
                      const away = standing.away_record || {}
                      const pts = (away.win || 0) * 3 + (away.draw || 0)
                      return (
                        <tr key={standing.id} className="border-t border-border">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {standing.team?.logo && (
                                <img src={standing.team.logo} alt="" className="w-4 h-4" />
                              )}
                              <span className="truncate max-w-[100px]">{standing.team?.name}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">{away.played || 0}</td>
                          <td className="p-2 text-center text-green-500">{away.win || 0}</td>
                          <td className="p-2 text-center">{away.draw || 0}</td>
                          <td className="p-2 text-center text-red-500">{away.lose || 0}</td>
                          <td className="p-2 text-center font-bold">{pts}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
