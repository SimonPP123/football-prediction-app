/**
 * Initial Data Import Script
 *
 * This script imports all historical data for Premier League 2025-2026 season
 * from API-Football into Supabase.
 *
 * Usage: npx tsx scripts/import/initial-import.ts
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
const API_FOOTBALL_BASE = process.env.API_FOOTBALL_BASE_URL!;

// Validate config
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !API_FOOTBALL_KEY) {
  console.error('Missing required environment variables!');
  console.log('SUPABASE_URL:', SUPABASE_URL ? 'set' : 'missing');
  console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'set' : 'missing');
  console.log('API_FOOTBALL_KEY:', API_FOOTBALL_KEY ? 'set' : 'missing');
  process.exit(1);
}

const LEAGUE_ID = 39; // Premier League
const SEASON = 2025; // 2025-2026 season (current season)

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// API-Football fetch helper
async function fetchAPI(endpoint: string): Promise<any> {
  const url = `${API_FOOTBALL_BASE}${endpoint}`;
  console.log(`Fetching: ${url}`);

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
  console.log(`API calls remaining: ${remaining}`);

  return data;
}

// Delay helper to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// =====================================================
// IMPORT TEAMS & VENUES
// =====================================================
async function importTeamsAndVenues() {
  console.log('\n=== Importing Teams & Venues ===\n');

  const data = await fetchAPI(`/teams?league=${LEAGUE_ID}&season=${SEASON}`);

  if (!data.response || data.response.length === 0) {
    console.log('No teams found');
    return;
  }

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
          // Note: API-Football doesn't provide lat/lng, you may need to add manually
        }, { onConflict: 'api_id' });

      if (venueError) {
        console.error(`Error inserting venue ${venue.name}:`, venueError.message);
      } else {
        console.log(`Venue: ${venue.name}`);
      }
    }

    // Get venue UUID
    const { data: venueData } = await supabase
      .from('venues')
      .select('id')
      .eq('api_id', venue?.id || 0)
      .single();

    // Insert/update team
    const { error: teamError } = await supabase
      .from('teams')
      .upsert({
        api_id: team.id,
        name: team.name,
        code: team.code,
        country: team.country,
        logo: team.logo,
        venue_id: venueData?.id || null,
      }, { onConflict: 'api_id' });

    if (teamError) {
      console.error(`Error inserting team ${team.name}:`, teamError.message);
    } else {
      console.log(`Team: ${team.name}`);
    }
  }

  console.log(`\nImported ${data.response.length} teams`);
}

// =====================================================
// IMPORT FIXTURES
// =====================================================
async function importFixtures() {
  console.log('\n=== Importing Fixtures ===\n');

  // Get league UUID
  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id')
    .eq('api_id', LEAGUE_ID)
    .single();

  if (!leagueData) {
    console.error('League not found in database');
    return;
  }

  const data = await fetchAPI(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);

  if (!data.response || data.response.length === 0) {
    console.log('No fixtures found');
    return;
  }

  // Build team lookup
  const { data: teams } = await supabase.from('teams').select('id, api_id');
  const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || []);

  // Build venue lookup
  const { data: venues } = await supabase.from('venues').select('id, api_id');
  const venueMap = new Map(venues?.map(v => [v.api_id, v.id]) || []);

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

    const { error } = await supabase
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
      }, { onConflict: 'api_id' });

    if (error) {
      console.error(`Error inserting fixture ${fixture.id}:`, error.message);
    } else {
      imported++;
    }
  }

  console.log(`\nImported ${imported} fixtures`);
}

// =====================================================
// IMPORT FIXTURE STATISTICS (for completed matches)
// =====================================================
async function importFixtureStatistics() {
  console.log('\n=== Importing Fixture Statistics ===\n');

  // Get completed fixtures
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, api_id')
    .eq('status', 'FT')
    .limit(200); // Process up to 200 completed fixtures

  if (!fixtures || fixtures.length === 0) {
    console.log('No completed fixtures found');
    return;
  }

  // Build team lookup
  const { data: teams } = await supabase.from('teams').select('id, api_id');
  const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || []);

  let imported = 0;

  for (const fixture of fixtures) {
    await delay(500); // Rate limiting

    try {
      const data = await fetchAPI(`/fixtures/statistics?fixture=${fixture.api_id}`);

      if (!data.response || data.response.length === 0) {
        continue;
      }

      for (const teamStats of data.response) {
        const teamId = teamMap.get(teamStats.team.id);
        if (!teamId) continue;

        // Parse statistics array into object
        const statsObj: Record<string, any> = {};
        for (const stat of teamStats.statistics) {
          statsObj[stat.type] = stat.value;
        }

        const { error } = await supabase
          .from('fixture_statistics')
          .upsert({
            fixture_id: fixture.id,
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
            ball_possession: parseFloat(statsObj['Ball Possession']?.replace('%', '')) || null,
            yellow_cards: parseInt(statsObj['Yellow Cards']) || null,
            red_cards: parseInt(statsObj['Red Cards']) || null,
            goalkeeper_saves: parseInt(statsObj['Goalkeeper Saves']) || null,
            passes_total: parseInt(statsObj['Total passes']) || null,
            passes_accurate: parseInt(statsObj['Passes accurate']) || null,
            passes_pct: parseFloat(statsObj['Passes %']?.replace('%', '')) || null,
            expected_goals: parseFloat(statsObj['expected_goals']) || null,
          }, { onConflict: 'fixture_id,team_id' });

        if (error) {
          console.error(`Error inserting stats for fixture ${fixture.api_id}:`, error.message);
        } else {
          imported++;
        }
      }

      console.log(`Fixture ${fixture.api_id}: stats imported`);
    } catch (err) {
      console.error(`Error fetching stats for fixture ${fixture.api_id}:`, err);
    }
  }

  console.log(`\nImported ${imported} fixture statistics records`);
}

// =====================================================
// IMPORT STANDINGS
// =====================================================
async function importStandings() {
  console.log('\n=== Importing Standings ===\n');

  // Get league UUID
  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id')
    .eq('api_id', LEAGUE_ID)
    .single();

  if (!leagueData) {
    console.error('League not found in database');
    return;
  }

  const data = await fetchAPI(`/standings?league=${LEAGUE_ID}&season=${SEASON}`);

  if (!data.response || data.response.length === 0) {
    console.log('No standings found');
    return;
  }

  // Build team lookup
  const { data: teams } = await supabase.from('teams').select('id, api_id');
  const teamMap = new Map(teams?.map(t => [t.api_id, t.id]) || []);

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

    if (error) {
      console.error(`Error inserting standing for team ${item.team.name}:`, error.message);
    } else {
      console.log(`${item.rank}. ${item.team.name} - ${item.points} pts`);
      imported++;
    }
  }

  console.log(`\nImported ${imported} standings`);
}

// =====================================================
// IMPORT TEAM SEASON STATISTICS
// =====================================================
async function importTeamStats() {
  console.log('\n=== Importing Team Season Statistics ===\n');

  // Get league UUID
  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id')
    .eq('api_id', LEAGUE_ID)
    .single();

  if (!leagueData) {
    console.error('League not found in database');
    return;
  }

  // Get all teams
  const { data: teams } = await supabase.from('teams').select('id, api_id, name');

  if (!teams || teams.length === 0) {
    console.log('No teams found');
    return;
  }

  let imported = 0;

  for (const team of teams) {
    await delay(500); // Rate limiting

    try {
      const data = await fetchAPI(`/teams/statistics?league=${LEAGUE_ID}&season=${SEASON}&team=${team.api_id}`);

      if (!data.response) {
        continue;
      }

      const stats = data.response;

      const { error } = await supabase
        .from('team_season_stats')
        .upsert({
          team_id: team.id,
          league_id: leagueData.id,
          season: SEASON,
          fixtures_played: stats.fixtures.played.total || 0,
          wins: stats.fixtures.wins.total || 0,
          draws: stats.fixtures.draws.total || 0,
          losses: stats.fixtures.loses.total || 0,
          goals_for: stats.goals.for.total.total || 0,
          goals_against: stats.goals.against.total.total || 0,
          goals_for_avg: stats.goals.for.average.total || null,
          goals_against_avg: stats.goals.against.average.total || null,
          clean_sheets: stats.clean_sheet.total || 0,
          failed_to_score: stats.failed_to_score.total || 0,
          penalties_scored: stats.penalty.scored.total || 0,
          penalties_missed: stats.penalty.missed.total || 0,
          form: stats.form,
          home_stats: {
            played: stats.fixtures.played.home,
            wins: stats.fixtures.wins.home,
            draws: stats.fixtures.draws.home,
            losses: stats.fixtures.loses.home,
            goals_for: stats.goals.for.total.home,
            goals_against: stats.goals.against.total.home,
          },
          away_stats: {
            played: stats.fixtures.played.away,
            wins: stats.fixtures.wins.away,
            draws: stats.fixtures.draws.away,
            losses: stats.fixtures.loses.away,
            goals_for: stats.goals.for.total.away,
            goals_against: stats.goals.against.total.away,
          },
          goals_by_minute: stats.goals.for.minute,
          cards_by_minute: stats.cards,
        }, { onConflict: 'team_id,league_id,season' });

      if (error) {
        console.error(`Error inserting stats for ${team.name}:`, error.message);
      } else {
        console.log(`${team.name}: ${stats.fixtures.played.total} games, ${stats.goals.for.total.total} goals`);
        imported++;
      }
    } catch (err) {
      console.error(`Error fetching stats for ${team.name}:`, err);
    }
  }

  console.log(`\nImported ${imported} team statistics`);
}

// =====================================================
// MAIN
// =====================================================
async function main() {
  console.log('========================================');
  console.log('Football Prediction - Initial Data Import');
  console.log('========================================');
  console.log(`League: Premier League (ID: ${LEAGUE_ID})`);
  console.log(`Season: ${SEASON}`);
  console.log('========================================\n');

  try {
    // Step 1: Import teams and venues
    await importTeamsAndVenues();
    await delay(1000);

    // Step 2: Import fixtures
    await importFixtures();
    await delay(1000);

    // Step 3: Import standings
    await importStandings();
    await delay(1000);

    // Step 4: Import team season stats
    await importTeamStats();
    await delay(1000);

    // Step 5: Import fixture statistics (limited to avoid rate limits)
    await importFixtureStatistics();

    console.log('\n========================================');
    console.log('Import Complete!');
    console.log('========================================');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
