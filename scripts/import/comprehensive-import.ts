/**
 * Comprehensive Data Import Script
 *
 * Imports ALL available data from API-Football for Premier League 2025-2026 season.
 * This includes teams, fixtures, players, coaches, transfers, H2H, and more.
 *
 * Usage: npx tsx scripts/import/comprehensive-import.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!;
const API_FOOTBALL_BASE = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';

// Validate config
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !API_FOOTBALL_KEY) {
  console.error('Missing required environment variables!');
  console.log('SUPABASE_URL:', SUPABASE_URL ? 'set' : 'missing');
  console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'set' : 'missing');
  console.log('API_FOOTBALL_KEY:', API_FOOTBALL_KEY ? 'set' : 'missing');
  process.exit(1);
}

const LEAGUE_ID = 39; // Premier League
const SEASON = 2025; // 2025-2026 season

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Track API calls
let apiCallCount = 0;

// API-Football fetch helper
async function fetchAPI(endpoint: string): Promise<any> {
  const url = `${API_FOOTBALL_BASE}${endpoint}`;
  console.log(`[API ${++apiCallCount}] ${endpoint}`);

  const response = await fetch(url, {
    headers: {
      'x-apisports-key': API_FOOTBALL_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Check rate limit
  const remaining = response.headers.get('x-ratelimit-requests-remaining');
  if (remaining && parseInt(remaining) < 10) {
    console.warn(`⚠️ Low API calls remaining: ${remaining}`);
  }

  return data;
}

// Delay helper to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Chunk array helper
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// =====================================================
// IMPORT TEAMS & VENUES
// =====================================================
async function importTeamsAndVenues(): Promise<Map<number, string>> {
  console.log('\n=== 1. Importing Teams & Venues ===\n');

  const data = await fetchAPI(`/teams?league=${LEAGUE_ID}&season=${SEASON}`);

  if (!data.response || data.response.length === 0) {
    console.log('No teams found');
    return new Map();
  }

  const teamMap = new Map<number, string>();

  for (const item of data.response) {
    const team = item.team;
    const venue = item.venue;

    // Insert/update venue first
    if (venue && venue.id) {
      const { error: venueError } = await supabase
        .from('venues')
        .upsert({
          api_id: venue.id,
          name: venue.name,
          city: venue.city,
          capacity: venue.capacity,
          surface: venue.surface,
        }, { onConflict: 'api_id' });

      if (venueError) {
        console.error(`Error inserting venue ${venue.name}:`, venueError.message);
      }
    }

    // Get venue UUID
    const { data: venueData } = await supabase
      .from('venues')
      .select('id')
      .eq('api_id', venue?.id || 0)
      .single();

    // Insert/update team
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .upsert({
        api_id: team.id,
        name: team.name,
        code: team.code,
        country: team.country,
        logo: team.logo,
        venue_id: venueData?.id || null,
      }, { onConflict: 'api_id' })
      .select('id')
      .single();

    if (teamError) {
      console.error(`Error inserting team ${team.name}:`, teamError.message);
    } else {
      console.log(`✓ ${team.name}`);
      if (teamData) {
        teamMap.set(team.id, teamData.id);
      }
    }
  }

  // Build complete team map
  const { data: allTeams } = await supabase.from('teams').select('id, api_id');
  allTeams?.forEach(t => teamMap.set(t.api_id, t.id));

  console.log(`\nImported ${data.response.length} teams`);
  return teamMap;
}

// =====================================================
// IMPORT COACHES
// =====================================================
async function importCoaches(teamMap: Map<number, string>) {
  console.log('\n=== 2. Importing Coaches ===\n');

  let imported = 0;

  for (const [apiId, teamId] of teamMap) {
    await delay(300);

    try {
      const data = await fetchAPI(`/coachs?team=${apiId}`);

      if (!data.response || data.response.length === 0) {
        continue;
      }

      // Get the current coach (first in list usually)
      const coach = data.response[0];

      const { error } = await supabase
        .from('coaches')
        .upsert({
          api_id: coach.id,
          name: coach.name,
          firstname: coach.firstname,
          lastname: coach.lastname,
          age: coach.age,
          birth_date: coach.birth?.date,
          birth_place: coach.birth?.place,
          birth_country: coach.birth?.country,
          nationality: coach.nationality,
          photo: coach.photo,
          team_id: teamId,
          career: coach.career,
        }, { onConflict: 'api_id' });

      if (error) {
        console.error(`Error inserting coach ${coach.name}:`, error.message);
      } else {
        console.log(`✓ ${coach.name} (${coach.team?.name || 'Unknown team'})`);
        imported++;
      }
    } catch (err) {
      console.error(`Error fetching coach for team ${apiId}:`, err);
    }
  }

  console.log(`\nImported ${imported} coaches`);
}

// =====================================================
// IMPORT PLAYER SQUADS
// =====================================================
async function importPlayerSquads(teamMap: Map<number, string>): Promise<Map<number, string>> {
  console.log('\n=== 3. Importing Player Squads ===\n');

  const playerMap = new Map<number, string>();
  let totalPlayers = 0;

  for (const [apiId, teamId] of teamMap) {
    await delay(300);

    try {
      const data = await fetchAPI(`/players/squads?team=${apiId}`);

      if (!data.response || data.response.length === 0) {
        continue;
      }

      const squad = data.response[0];
      console.log(`\n${squad.team?.name || 'Team'} (${squad.players?.length || 0} players):`);

      for (const player of squad.players || []) {
        // Insert player
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .upsert({
            api_id: player.id,
            name: player.name,
            age: player.age,
            photo: player.photo,
          }, { onConflict: 'api_id' })
          .select('id')
          .single();

        if (playerError) {
          console.error(`Error inserting player ${player.name}:`, playerError.message);
          continue;
        }

        if (playerData) {
          playerMap.set(player.id, playerData.id);

          // Insert squad assignment
          const { error: squadError } = await supabase
            .from('player_squads')
            .upsert({
              player_id: playerData.id,
              team_id: teamId,
              season: SEASON,
              number: player.number,
              position: player.position,
            }, { onConflict: 'player_id,team_id,season' });

          if (!squadError) {
            console.log(`  ✓ #${player.number || '?'} ${player.name} (${player.position})`);
            totalPlayers++;
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching squad for team ${apiId}:`, err);
    }
  }

  console.log(`\nImported ${totalPlayers} players into squads`);
  return playerMap;
}

// =====================================================
// IMPORT FIXTURES
// =====================================================
async function importFixtures(teamMap: Map<number, string>): Promise<{ fixtureMap: Map<number, string>, completedFixtureApiIds: number[] }> {
  console.log('\n=== 4. Importing Fixtures ===\n');

  // Get league UUID
  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id')
    .eq('api_id', LEAGUE_ID)
    .single();

  if (!leagueData) {
    console.error('League not found in database');
    return { fixtureMap: new Map(), completedFixtureApiIds: [] };
  }

  const data = await fetchAPI(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);

  if (!data.response || data.response.length === 0) {
    console.log('No fixtures found');
    return { fixtureMap: new Map(), completedFixtureApiIds: [] };
  }

  // Build venue lookup
  const { data: venues } = await supabase.from('venues').select('id, api_id');
  const venueMap = new Map(venues?.map(v => [v.api_id, v.id]) || []);

  const fixtureMap = new Map<number, string>();
  const completedFixtureApiIds: number[] = [];
  let imported = 0;

  for (const item of data.response) {
    const fixture = item.fixture;
    const league = item.league;
    const teams_data = item.teams;
    const goals = item.goals;
    const score = item.score;

    const homeTeamId = teamMap.get(teams_data.home.id);
    const awayTeamId = teamMap.get(teams_data.away.id);

    if (!homeTeamId || !awayTeamId) {
      console.warn(`Team not found for fixture ${fixture.id}`);
      continue;
    }

    const { data: fixtureData, error } = await supabase
      .from('fixtures')
      .upsert({
        api_id: fixture.id,
        league_id: leagueData.id,
        season: SEASON,
        round: league.round,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: fixture.date,
        venue_id: venueMap.get(fixture.venue?.id) || null,
        referee: fixture.referee,
        status: fixture.status.short,
        goals_home: goals.home,
        goals_away: goals.away,
        score_halftime: score.halftime,
        score_fulltime: score.fulltime,
      }, { onConflict: 'api_id' })
      .select('id')
      .single();

    if (error) {
      console.error(`Error inserting fixture ${fixture.id}:`, error.message);
    } else {
      imported++;
      if (fixtureData) {
        fixtureMap.set(fixture.id, fixtureData.id);
      }

      // Track completed fixtures
      if (['FT', 'AET', 'PEN'].includes(fixture.status.short)) {
        completedFixtureApiIds.push(fixture.id);
      }
    }
  }

  console.log(`Imported ${imported} fixtures (${completedFixtureApiIds.length} completed)`);
  return { fixtureMap, completedFixtureApiIds };
}

// =====================================================
// IMPORT FIXTURE DETAILS (Bulk - events, lineups, stats, players)
// =====================================================
async function importFixtureDetails(
  completedFixtureApiIds: number[],
  fixtureMap: Map<number, string>,
  teamMap: Map<number, string>,
  playerMap: Map<number, string>
) {
  console.log('\n=== 5. Importing Fixture Details (Bulk) ===\n');
  console.log(`Processing ${completedFixtureApiIds.length} completed fixtures...`);

  // Chunk into groups of 20 (API limit)
  const chunks = chunkArray(completedFixtureApiIds, 20);
  let processedFixtures = 0;
  let processedEvents = 0;
  let processedStats = 0;
  let processedLineups = 0;
  let processedPlayerStats = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await delay(500);

    console.log(`\nProcessing chunk ${i + 1}/${chunks.length} (${chunk.length} fixtures)...`);

    try {
      const ids = chunk.join('-');
      const data = await fetchAPI(`/fixtures?ids=${ids}`);

      if (!data.response) continue;

      for (const item of data.response) {
        const fixtureApiId = item.fixture.id;
        const fixtureId = fixtureMap.get(fixtureApiId);

        if (!fixtureId) continue;

        // Process Events
        if (item.events && item.events.length > 0) {
          for (const event of item.events) {
            const teamId = teamMap.get(event.team?.id);
            const playerId = playerMap.get(event.player?.id);
            const assistPlayerId = playerMap.get(event.assist?.id);

            // Try upsert first, fall back to insert
            const { error } = await supabase
              .from('fixture_events')
              .upsert({
                fixture_id: fixtureId,
                team_id: teamId,
                player_id_uuid: playerId,
                player_name: event.player?.name,
                player_id: event.player?.id,
                assist_player_id: assistPlayerId,
                assist_player_name: event.assist?.name,
                assist_name: event.assist?.name,
                assist_id: event.assist?.id,
                event_time: event.time?.elapsed,
                elapsed: event.time?.elapsed,
                extra_time: event.time?.extra,
                event_type: event.type,
                type: event.type,
                event_detail: event.detail,
                detail: event.detail,
                comments: event.comments,
              }, { onConflict: 'fixture_id,event_time,event_type,player_name', ignoreDuplicates: true });

            if (!error) processedEvents++;
          }
        }

        // Process Statistics
        if (item.statistics && item.statistics.length > 0) {
          for (const teamStats of item.statistics) {
            const teamId = teamMap.get(teamStats.team?.id);
            if (!teamId) continue;

            const statsObj: Record<string, any> = {};
            for (const stat of teamStats.statistics || []) {
              statsObj[stat.type] = stat.value;
            }

            const { error } = await supabase
              .from('fixture_statistics')
              .upsert({
                fixture_id: fixtureId,
                team_id: teamId,
                shots_total: parseInt(statsObj['Total Shots']) || null,
                shots_on_goal: parseInt(statsObj['Shots on Goal']) || null,
                shots_off_goal: parseInt(statsObj['Shots off Goal']) || null,
                shots_blocked: parseInt(statsObj['Blocked Shots']) || null,
                shots_inside_box: parseInt(statsObj['Shots insidebox']) || null,
                shots_outside_box: parseInt(statsObj['Shots outsidebox']) || null,
                corners: parseInt(statsObj['Corner Kicks']) || null,
                offsides: parseInt(statsObj['Offsides']) || null,
                fouls: parseInt(statsObj['Fouls']) || null,
                ball_possession: parseFloat(statsObj['Ball Possession']?.replace?.('%', '')) || null,
                yellow_cards: parseInt(statsObj['Yellow Cards']) || null,
                red_cards: parseInt(statsObj['Red Cards']) || null,
                goalkeeper_saves: parseInt(statsObj['Goalkeeper Saves']) || null,
                passes_total: parseInt(statsObj['Total passes']) || null,
                passes_accurate: parseInt(statsObj['Passes accurate']) || null,
                passes_pct: parseFloat(statsObj['Passes %']?.replace?.('%', '')) || null,
                expected_goals: parseFloat(statsObj['expected_goals']) || null,
              }, { onConflict: 'fixture_id,team_id' });

            if (!error) processedStats++;
          }
        }

        // Process Lineups
        if (item.lineups && item.lineups.length > 0) {
          for (const lineup of item.lineups) {
            const teamId = teamMap.get(lineup.team?.id);
            if (!teamId) continue;

            const { error } = await supabase
              .from('lineups')
              .upsert({
                fixture_id: fixtureId,
                team_id: teamId,
                formation: lineup.formation,
                coach_name: lineup.coach?.name,
                starting_xi: lineup.startXI?.map((p: any) => ({
                  id: p.player?.id,
                  name: p.player?.name,
                  number: p.player?.number,
                  pos: p.player?.pos,
                  grid: p.player?.grid,
                })),
                substitutes: lineup.substitutes?.map((p: any) => ({
                  id: p.player?.id,
                  name: p.player?.name,
                  number: p.player?.number,
                  pos: p.player?.pos,
                })),
              }, { onConflict: 'fixture_id,team_id' });

            if (!error) processedLineups++;
          }
        }

        // Process Player Stats
        if (item.players && item.players.length > 0) {
          for (const teamPlayers of item.players) {
            const teamId = teamMap.get(teamPlayers.team?.id);
            if (!teamId) continue;

            for (const playerData of teamPlayers.players || []) {
              const player = playerData.player;
              const stats = playerData.statistics?.[0];

              if (!player || !stats) continue;

              // Ensure player exists
              let playerId = playerMap.get(player.id);
              if (!playerId) {
                const { data: newPlayer } = await supabase
                  .from('players')
                  .upsert({
                    api_id: player.id,
                    name: player.name,
                    photo: player.photo,
                  }, { onConflict: 'api_id' })
                  .select('id')
                  .single();

                if (newPlayer) {
                  playerId = newPlayer.id;
                  playerMap.set(player.id, playerId);
                }
              }

              if (!playerId) continue;

              const { error } = await supabase
                .from('player_match_stats')
                .upsert({
                  fixture_id: fixtureId,
                  player_id: playerId,
                  team_id: teamId,
                  minutes: stats.games?.minutes,
                  number: stats.games?.number,
                  position: stats.games?.position,
                  rating: stats.games?.rating ? parseFloat(stats.games.rating) : null,
                  captain: stats.games?.captain || false,
                  substitute: stats.games?.substitute || false,
                  goals: stats.goals?.total || 0,
                  assists: stats.goals?.assists || 0,
                  saves: stats.goals?.saves || 0,
                  shots_total: stats.shots?.total || 0,
                  shots_on: stats.shots?.on || 0,
                  passes_total: stats.passes?.total || 0,
                  passes_key: stats.passes?.key || 0,
                  passes_accuracy: stats.passes?.accuracy ? parseFloat(stats.passes.accuracy) : null,
                  tackles: stats.tackles?.total || 0,
                  blocks: stats.tackles?.blocks || 0,
                  interceptions: stats.tackles?.interceptions || 0,
                  duels_total: stats.duels?.total || 0,
                  duels_won: stats.duels?.won || 0,
                  dribbles_attempts: stats.dribbles?.attempts || 0,
                  dribbles_success: stats.dribbles?.success || 0,
                  dribbles_past: stats.dribbles?.past || 0,
                  fouls_drawn: stats.fouls?.drawn || 0,
                  fouls_committed: stats.fouls?.committed || 0,
                  yellow_cards: stats.cards?.yellow || 0,
                  red_cards: stats.cards?.red || 0,
                  penalties_won: stats.penalty?.won || 0,
                  penalties_committed: stats.penalty?.commited || 0,
                  penalties_scored: stats.penalty?.scored || 0,
                  penalties_missed: stats.penalty?.missed || 0,
                  penalties_saved: stats.penalty?.saved || 0,
                  offsides: stats.offsides || 0,
                }, { onConflict: 'fixture_id,player_id' });

              if (!error) processedPlayerStats++;
            }
          }
        }

        processedFixtures++;
      }
    } catch (err) {
      console.error(`Error processing chunk ${i + 1}:`, err);
    }
  }

  console.log(`\nProcessed ${processedFixtures} fixtures:`);
  console.log(`  - Events: ${processedEvents}`);
  console.log(`  - Statistics: ${processedStats}`);
  console.log(`  - Lineups: ${processedLineups}`);
  console.log(`  - Player stats: ${processedPlayerStats}`);
}

// =====================================================
// IMPORT STANDINGS
// =====================================================
async function importStandings(teamMap: Map<number, string>) {
  console.log('\n=== 6. Importing Standings ===\n');

  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id')
    .eq('api_id', LEAGUE_ID)
    .single();

  if (!leagueData) {
    console.error('League not found');
    return;
  }

  const data = await fetchAPI(`/standings?league=${LEAGUE_ID}&season=${SEASON}`);

  if (!data.response || data.response.length === 0) {
    console.log('No standings found');
    return;
  }

  const standings = data.response[0].league.standings[0];
  let imported = 0;

  for (const item of standings) {
    const teamId = teamMap.get(item.team.id);
    if (!teamId) continue;

    const { error } = await supabase
      .from('standings')
      .upsert({
        league_id: leagueData.id,
        season: SEASON,
        team_id: teamId,
        rank: item.rank,
        points: item.points,
        goal_diff: item.goalsDiff,
        form: item.form,
        description: item.description,
        played: item.all.played,
        won: item.all.win,
        drawn: item.all.draw,
        lost: item.all.lose,
        goals_for: item.all.goals.for,
        goals_against: item.all.goals.against,
        home_record: item.home,
        away_record: item.away,
      }, { onConflict: 'league_id,season,team_id' });

    if (!error) {
      console.log(`${item.rank}. ${item.team.name} - ${item.points} pts`);
      imported++;
    }
  }

  console.log(`\nImported ${imported} standings`);
}

// =====================================================
// IMPORT TOP PERFORMERS (Scorers, Assists, Cards)
// =====================================================
async function importTopPerformers(teamMap: Map<number, string>, playerMap: Map<number, string>) {
  console.log('\n=== 7. Importing Top Performers ===\n');

  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id')
    .eq('api_id', LEAGUE_ID)
    .single();

  if (!leagueData) return;

  const categories = [
    { endpoint: '/players/topscorers', category: 'goals', label: 'Top Scorers' },
    { endpoint: '/players/topassists', category: 'assists', label: 'Top Assists' },
    { endpoint: '/players/topyellowcards', category: 'yellow_cards', label: 'Yellow Cards' },
    { endpoint: '/players/topredcards', category: 'red_cards', label: 'Red Cards' },
  ];

  for (const cat of categories) {
    await delay(300);

    try {
      const data = await fetchAPI(`${cat.endpoint}?league=${LEAGUE_ID}&season=${SEASON}`);

      if (!data.response) continue;

      console.log(`\n${cat.label}:`);

      let rank = 1;
      for (const item of data.response) {
        const player = item.player;
        const stats = item.statistics?.[0];

        if (!player || !stats) continue;

        // Get or create player
        let playerId = playerMap.get(player.id);
        if (!playerId) {
          const { data: newPlayer } = await supabase
            .from('players')
            .upsert({
              api_id: player.id,
              name: player.name,
              firstname: player.firstname,
              lastname: player.lastname,
              age: player.age,
              birth_date: player.birth?.date,
              nationality: player.nationality,
              height: player.height,
              weight: player.weight,
              photo: player.photo,
              injured: player.injured,
            }, { onConflict: 'api_id' })
            .select('id')
            .single();

          if (newPlayer) {
            playerId = newPlayer.id;
            playerMap.set(player.id, playerId);
          }
        }

        const teamId = teamMap.get(stats.team?.id);
        let value = 0;

        switch (cat.category) {
          case 'goals':
            value = stats.goals?.total || 0;
            break;
          case 'assists':
            value = stats.goals?.assists || 0;
            break;
          case 'yellow_cards':
            value = stats.cards?.yellow || 0;
            break;
          case 'red_cards':
            value = stats.cards?.red || 0;
            break;
        }

        const { error } = await supabase
          .from('top_performers')
          .upsert({
            league_id: leagueData.id,
            season: SEASON,
            category: cat.category,
            rank: rank,
            player_api_id: player.id,
            player_id: playerId,
            player_name: player.name,
            player_photo: player.photo,
            team_api_id: stats.team?.id,
            team_id: teamId,
            team_name: stats.team?.name,
            team_logo: stats.team?.logo,
            value: value,
            appearances: stats.games?.appearences,
          }, { onConflict: 'league_id,season,category,player_api_id' });

        if (!error) {
          console.log(`  ${rank}. ${player.name} (${stats.team?.name}) - ${value}`);
        }

        rank++;
      }
    } catch (err) {
      console.error(`Error fetching ${cat.label}:`, err);
    }
  }
}

// =====================================================
// IMPORT TEAM SEASON STATISTICS
// =====================================================
async function importTeamStats(teamMap: Map<number, string>) {
  console.log('\n=== 8. Importing Team Season Statistics ===\n');

  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id')
    .eq('api_id', LEAGUE_ID)
    .single();

  if (!leagueData) return;

  let imported = 0;

  for (const [apiId, teamId] of teamMap) {
    await delay(300);

    try {
      const data = await fetchAPI(`/teams/statistics?league=${LEAGUE_ID}&season=${SEASON}&team=${apiId}`);

      if (!data.response) continue;

      const stats = data.response;

      const { error } = await supabase
        .from('team_season_stats')
        .upsert({
          team_id: teamId,
          league_id: leagueData.id,
          season: SEASON,
          fixtures_played: stats.fixtures?.played?.total || 0,
          wins: stats.fixtures?.wins?.total || 0,
          draws: stats.fixtures?.draws?.total || 0,
          losses: stats.fixtures?.loses?.total || 0,
          goals_for: stats.goals?.for?.total?.total || 0,
          goals_against: stats.goals?.against?.total?.total || 0,
          goals_for_avg: stats.goals?.for?.average?.total || null,
          goals_against_avg: stats.goals?.against?.average?.total || null,
          clean_sheets: stats.clean_sheet?.total || 0,
          failed_to_score: stats.failed_to_score?.total || 0,
          penalties_scored: stats.penalty?.scored?.total || 0,
          penalties_missed: stats.penalty?.missed?.total || 0,
          form: stats.form,
          home_stats: {
            played: stats.fixtures?.played?.home,
            wins: stats.fixtures?.wins?.home,
            draws: stats.fixtures?.draws?.home,
            losses: stats.fixtures?.loses?.home,
            goals_for: stats.goals?.for?.total?.home,
            goals_against: stats.goals?.against?.total?.home,
          },
          away_stats: {
            played: stats.fixtures?.played?.away,
            wins: stats.fixtures?.wins?.away,
            draws: stats.fixtures?.draws?.away,
            losses: stats.fixtures?.loses?.away,
            goals_for: stats.goals?.for?.total?.away,
            goals_against: stats.goals?.against?.total?.away,
          },
          goals_by_minute: stats.goals?.for?.minute,
          cards_by_minute: stats.cards,
        }, { onConflict: 'team_id,league_id,season' });

      if (!error) {
        console.log(`✓ ${stats.team?.name}: ${stats.fixtures?.played?.total} games, ${stats.goals?.for?.total?.total} goals`);
        imported++;
      }
    } catch (err) {
      console.error(`Error fetching team stats:`, err);
    }
  }

  console.log(`\nImported ${imported} team statistics`);
}

// =====================================================
// IMPORT INJURIES
// =====================================================
async function importInjuries(teamMap: Map<number, string>, playerMap: Map<number, string>) {
  console.log('\n=== 9. Importing Injuries ===\n');

  const data = await fetchAPI(`/injuries?league=${LEAGUE_ID}&season=${SEASON}`);

  if (!data.response || data.response.length === 0) {
    console.log('No injuries found');
    return;
  }

  let imported = 0;

  for (const item of data.response) {
    const player = item.player;
    const team = item.team;

    // Get or create player
    let playerId = playerMap.get(player.id);
    if (!playerId) {
      const { data: newPlayer } = await supabase
        .from('players')
        .upsert({
          api_id: player.id,
          name: player.name,
          photo: player.photo,
        }, { onConflict: 'api_id' })
        .select('id')
        .single();

      if (newPlayer) {
        playerId = newPlayer.id;
        playerMap.set(player.id, playerId);

        // Mark as injured
        await supabase
          .from('players')
          .update({ injured: true })
          .eq('id', playerId);
      }
    }

    const teamId = teamMap.get(team.id);

    // Get fixture if exists
    const { data: fixtureData } = await supabase
      .from('fixtures')
      .select('id')
      .eq('api_id', item.fixture?.id)
      .single();

    const { error } = await supabase
      .from('injuries')
      .upsert({
        player_id: playerId,
        player_name: player.name,
        team_id: teamId,
        fixture_id: fixtureData?.id,
        injury_type: player.type,
        injury_reason: player.reason,
        reported_date: item.fixture?.date,
      }, { onConflict: 'player_id,reported_date' });

    if (!error) {
      console.log(`✓ ${player.name} (${team.name}): ${player.type} - ${player.reason}`);
      imported++;
    }
  }

  console.log(`\nImported ${imported} injuries`);
}

// =====================================================
// IMPORT HEAD TO HEAD
// =====================================================
async function importH2H(teamMap: Map<number, string>, fixtureMap: Map<number, string>) {
  console.log('\n=== 10. Importing Head-to-Head History ===\n');

  const teamApiIds = Array.from(teamMap.keys());
  const pairs: [number, number][] = [];

  // Generate all unique pairs
  for (let i = 0; i < teamApiIds.length; i++) {
    for (let j = i + 1; j < teamApiIds.length; j++) {
      pairs.push([teamApiIds[i], teamApiIds[j]]);
    }
  }

  console.log(`Processing ${pairs.length} team pairs...`);

  let imported = 0;

  for (let i = 0; i < pairs.length; i++) {
    const [team1ApiId, team2ApiId] = pairs[i];
    await delay(300);

    try {
      const data = await fetchAPI(`/fixtures/headtohead?h2h=${team1ApiId}-${team2ApiId}&last=10`);

      if (!data.response || data.response.length === 0) continue;

      const team1Id = teamMap.get(team1ApiId);
      const team2Id = teamMap.get(team2ApiId);

      if (!team1Id || !team2Id) continue;

      // Calculate H2H stats
      let team1Wins = 0, team2Wins = 0, draws = 0;
      let team1Goals = 0, team2Goals = 0;
      const fixtures: any[] = [];

      for (const match of data.response) {
        const homeTeam = match.teams.home;
        const awayTeam = match.teams.away;
        const homeGoals = match.goals.home || 0;
        const awayGoals = match.goals.away || 0;

        fixtures.push({
          date: match.fixture.date,
          home_team: homeTeam.name,
          away_team: awayTeam.name,
          home_goals: homeGoals,
          away_goals: awayGoals,
        });

        if (homeTeam.id === team1ApiId) {
          team1Goals += homeGoals;
          team2Goals += awayGoals;
          if (homeGoals > awayGoals) team1Wins++;
          else if (awayGoals > homeGoals) team2Wins++;
          else draws++;
        } else {
          team1Goals += awayGoals;
          team2Goals += homeGoals;
          if (awayGoals > homeGoals) team1Wins++;
          else if (homeGoals > awayGoals) team2Wins++;
          else draws++;
        }
      }

      const { error } = await supabase
        .from('head_to_head')
        .upsert({
          team1_id: team1Id,
          team2_id: team2Id,
          matches_played: data.response.length,
          team1_wins: team1Wins,
          team2_wins: team2Wins,
          draws: draws,
          team1_goals: team1Goals,
          team2_goals: team2Goals,
          last_fixtures: fixtures,
        }, { onConflict: 'team1_id,team2_id' });

      if (!error) imported++;

      if ((i + 1) % 20 === 0) {
        console.log(`Progress: ${i + 1}/${pairs.length} pairs processed`);
      }
    } catch (err) {
      // Continue on error
    }
  }

  console.log(`\nImported ${imported} H2H records`);
}

// =====================================================
// IMPORT TRANSFERS
// =====================================================
async function importTransfers(teamMap: Map<number, string>, playerMap: Map<number, string>) {
  console.log('\n=== 11. Importing Transfers ===\n');

  let imported = 0;

  for (const [apiId, teamId] of teamMap) {
    await delay(300);

    try {
      const data = await fetchAPI(`/transfers?team=${apiId}`);

      if (!data.response || data.response.length === 0) continue;

      for (const item of data.response) {
        const player = item.player;
        const transfers = item.transfers || [];

        // Get recent transfers (last 2 years)
        const recentTransfers = transfers.filter((t: any) => {
          const transferDate = new Date(t.date);
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
          return transferDate >= twoYearsAgo;
        });

        for (const transfer of recentTransfers.slice(0, 5)) {
          const playerId = playerMap.get(player.id);
          const fromTeamId = teamMap.get(transfer.teams?.out?.id);
          const toTeamId = teamMap.get(transfer.teams?.in?.id);

          const { error } = await supabase
            .from('transfers')
            .upsert({
              player_api_id: player.id,
              player_id: playerId,
              player_name: player.name,
              from_team_api_id: transfer.teams?.out?.id,
              from_team_id: fromTeamId,
              from_team_name: transfer.teams?.out?.name,
              to_team_api_id: transfer.teams?.in?.id,
              to_team_id: toTeamId,
              to_team_name: transfer.teams?.in?.name,
              transfer_date: transfer.date,
              transfer_type: transfer.type,
            }, { onConflict: 'player_api_id,transfer_date,to_team_api_id' });

          if (!error) imported++;
        }
      }
    } catch (err) {
      // Continue on error
    }
  }

  console.log(`Imported ${imported} transfers`);
}

// =====================================================
// IMPORT PLAYER SEASON STATS (Paginated)
// =====================================================
async function importPlayerSeasonStats(teamMap: Map<number, string>, playerMap: Map<number, string>) {
  console.log('\n=== 12. Importing Player Season Statistics ===\n');

  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id')
    .eq('api_id', LEAGUE_ID)
    .single();

  if (!leagueData) return;

  let page = 1;
  let totalPages = 1;
  let imported = 0;

  while (page <= totalPages) {
    await delay(400);

    try {
      const data = await fetchAPI(`/players?league=${LEAGUE_ID}&season=${SEASON}&page=${page}`);

      if (!data.response) break;

      totalPages = data.paging?.total || 1;
      console.log(`Processing page ${page}/${totalPages}...`);

      for (const item of data.response) {
        const player = item.player;
        const stats = item.statistics?.[0];

        if (!player || !stats) continue;

        // Upsert player with full details
        const { data: playerData } = await supabase
          .from('players')
          .upsert({
            api_id: player.id,
            name: player.name,
            firstname: player.firstname,
            lastname: player.lastname,
            age: player.age,
            birth_date: player.birth?.date,
            birth_place: player.birth?.place,
            birth_country: player.birth?.country,
            nationality: player.nationality,
            height: player.height,
            weight: player.weight,
            photo: player.photo,
            injured: player.injured,
          }, { onConflict: 'api_id' })
          .select('id')
          .single();

        if (!playerData) continue;

        playerMap.set(player.id, playerData.id);

        const teamId = teamMap.get(stats.team?.id);

        const { error } = await supabase
          .from('player_season_stats')
          .upsert({
            player_id: playerData.id,
            team_id: teamId,
            league_id: leagueData.id,
            season: SEASON,
            position: stats.games?.position,
            appearances: stats.games?.appearences || 0,
            lineups: stats.games?.lineups || 0,
            minutes: stats.games?.minutes || 0,
            rating: stats.games?.rating ? parseFloat(stats.games.rating) : null,
            goals: stats.goals?.total || 0,
            assists: stats.goals?.assists || 0,
            saves: stats.goals?.saves || 0,
            tackles: stats.tackles?.total || 0,
            duels_total: stats.duels?.total || 0,
            duels_won: stats.duels?.won || 0,
            dribbles_attempts: stats.dribbles?.attempts || 0,
            dribbles_success: stats.dribbles?.success || 0,
            fouls_drawn: stats.fouls?.drawn || 0,
            fouls_committed: stats.fouls?.committed || 0,
            yellow_cards: stats.cards?.yellow || 0,
            yellowred_cards: stats.cards?.yellowred || 0,
            red_cards: stats.cards?.red || 0,
            penalties_won: stats.penalty?.won || 0,
            penalties_committed: stats.penalty?.commited || 0,
            penalties_scored: stats.penalty?.scored || 0,
            penalties_missed: stats.penalty?.missed || 0,
            penalties_saved: stats.penalty?.saved || 0,
            passes_total: stats.passes?.total || 0,
            passes_key: stats.passes?.key || 0,
            passes_accuracy: stats.passes?.accuracy ? parseFloat(stats.passes.accuracy) : null,
            shots_total: stats.shots?.total || 0,
            shots_on: stats.shots?.on || 0,
          }, { onConflict: 'player_id,team_id,league_id,season' });

        if (!error) imported++;
      }

      page++;
    } catch (err) {
      console.error(`Error on page ${page}:`, err);
      break;
    }
  }

  console.log(`\nImported ${imported} player season statistics`);
}

// =====================================================
// MAIN
// =====================================================
async function main() {
  console.log('========================================================');
  console.log('Football Prediction - Comprehensive Data Import');
  console.log('========================================================');
  console.log(`League: Premier League (ID: ${LEAGUE_ID})`);
  console.log(`Season: ${SEASON} (2025-2026)`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('========================================================\n');

  const startTime = Date.now();

  try {
    // Step 1: Import teams and venues
    const teamMap = await importTeamsAndVenues();
    await delay(500);

    // Step 2: Import coaches
    await importCoaches(teamMap);
    await delay(500);

    // Step 3: Import player squads
    const playerMap = await importPlayerSquads(teamMap);
    await delay(500);

    // Step 4: Import fixtures
    const { fixtureMap, completedFixtureApiIds } = await importFixtures(teamMap);
    await delay(500);

    // Step 5: Import fixture details (bulk)
    await importFixtureDetails(completedFixtureApiIds, fixtureMap, teamMap, playerMap);
    await delay(500);

    // Step 6: Import standings
    await importStandings(teamMap);
    await delay(500);

    // Step 7: Import top performers
    await importTopPerformers(teamMap, playerMap);
    await delay(500);

    // Step 8: Import team season stats
    await importTeamStats(teamMap);
    await delay(500);

    // Step 9: Import injuries
    await importInjuries(teamMap, playerMap);
    await delay(500);

    // Step 10: Import H2H (this takes longer)
    await importH2H(teamMap, fixtureMap);
    await delay(500);

    // Step 11: Import transfers
    await importTransfers(teamMap, playerMap);
    await delay(500);

    // Step 12: Import player season stats (paginated)
    await importPlayerSeasonStats(teamMap, playerMap);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log('\n========================================================');
    console.log('Import Complete!');
    console.log('========================================================');
    console.log(`Total API calls: ${apiCallCount}`);
    console.log(`Duration: ${duration} minutes`);
    console.log('========================================================');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
