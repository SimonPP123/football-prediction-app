import { getTopPerformers } from '@/lib/supabase/queries'
import { Header } from '@/components/layout/header'

export default async function StatsPage() {
  const [scorers, assists, yellowCards, redCards] = await Promise.all([
    getTopPerformers('goals', 15),
    getTopPerformers('assists', 15),
    getTopPerformers('yellow_cards', 15),
    getTopPerformers('red_cards', 10),
  ])

  return (
    <div className="min-h-screen">
      <Header title="Statistics" subtitle="Premier League 2025-2026" />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Scorers */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Top Scorers</h2>
            </div>
            <div className="divide-y divide-border">
              {scorers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                scorers.map((player: any) => (
                  <div key={player.id} className="p-3 flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-muted-foreground">
                      {player.rank}
                    </span>
                    {player.player_photo && (
                      <img
                        src={player.player_photo}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{player.player_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {player.team_logo && (
                          <img src={player.team_logo} alt="" className="w-4 h-4" />
                        )}
                        {player.team_name}
                        {player.appearances && ` • ${player.appearances} apps`}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-green-500">
                      {player.value}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Assists */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Top Assists</h2>
            </div>
            <div className="divide-y divide-border">
              {assists.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                assists.map((player: any) => (
                  <div key={player.id} className="p-3 flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-muted-foreground">
                      {player.rank}
                    </span>
                    {player.player_photo && (
                      <img
                        src={player.player_photo}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{player.player_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {player.team_logo && (
                          <img src={player.team_logo} alt="" className="w-4 h-4" />
                        )}
                        {player.team_name}
                        {player.appearances && ` • ${player.appearances} apps`}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-blue-500">
                      {player.value}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Yellow Cards */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Yellow Cards</h2>
            </div>
            <div className="divide-y divide-border">
              {yellowCards.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                yellowCards.map((player: any) => (
                  <div key={player.id} className="p-3 flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-muted-foreground">
                      {player.rank}
                    </span>
                    {player.player_photo && (
                      <img
                        src={player.player_photo}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{player.player_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {player.team_logo && (
                          <img src={player.team_logo} alt="" className="w-4 h-4" />
                        )}
                        {player.team_name}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-yellow-500">
                      {player.value}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Red Cards */}
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Red Cards</h2>
            </div>
            <div className="divide-y divide-border">
              {redCards.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                redCards.map((player: any) => (
                  <div key={player.id} className="p-3 flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-muted-foreground">
                      {player.rank}
                    </span>
                    {player.player_photo && (
                      <img
                        src={player.player_photo}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{player.player_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {player.team_logo && (
                          <img src={player.team_logo} alt="" className="w-4 h-4" />
                        )}
                        {player.team_name}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-red-500">
                      {player.value}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
