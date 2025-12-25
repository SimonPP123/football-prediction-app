import { getTeams, getStandings } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'
import Link from 'next/link'

export default async function TeamsPage() {
  const [teams, standings] = await Promise.all([
    getTeams(),
    getStandings(),
  ])

  // Create a map of team standings
  const standingsMap = new Map(
    standings.map((s: any) => [s.team_id, s])
  )

  return (
    <div className="min-h-screen">
      <Header title="Teams" subtitle="Premier League 2025-2026" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {teams.map((team: any) => {
            const standing = standingsMap.get(team.id)
            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {team.logo && (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-16 h-16 object-contain group-hover:scale-110 transition-transform"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold break-words">{team.name}</h3>
                    {team.code && (
                      <p className="text-sm text-muted-foreground">{team.code}</p>
                    )}
                    {standing && (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <span className="bg-muted px-2 py-0.5 rounded font-medium">
                          #{standing.rank}
                        </span>
                        <span className="text-muted-foreground">
                          {standing.points} pts
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {standing && standing.form && (
                  <div className="mt-3 flex gap-1">
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
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
