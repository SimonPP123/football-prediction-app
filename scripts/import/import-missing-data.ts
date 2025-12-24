/**
 * Targeted Import Script for Missing Data
 *
 * Imports only the tables that are currently empty:
 * - injuries
 * - fixture_events
 * - head_to_head
 * - transfers
 *
 * Usage: npx tsx scripts/import/import-missing-data.ts
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
  process.exit(1);
}

const LEAGUE_ID = 39; // Premier League
const SEASON = 2025;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let apiCallCount = 0;

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
  const remaining = response.headers.get('x-ratelimit-requests-remaining');
  if (remaining) console.log(`  API calls remaining: ${remaining}`);

  return data;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get existing team mappings
async function getTeamMap(): Promise<Map<number, string>> {
  const { data } = await supabase.from('teams').select('id, api_id');
  const map = new Map<number, string>();
  for (const team of data || []) {
    map.set(team.api_id, team.id);
  }
  console.log(`Loaded ${map.size} teams`);
  return map;
}

// Get existing player mappings
async function getPlayerMap(): Promise<Map<number, string>> {
  const { data } = await supabase.from('players').select('id, api_id');
  const map = new Map<number, string>();
  for (const player of data || []) {
    map.set(player.api_id, player.id);
  }
  console.log(`Loaded ${map.size} players`);
  return map;
}

// Get existing fixture mappings
async function getFixtureMap(): Promise<Map<number, string>> {
  const { data } = await supabase.from('fixtures').select('id, api_id');
  const map = new Map<number, string>();
  for (const fixture of data || []) {
    map.set(fixture.api_id, fixture.id);
  }
  console.log(`Loaded ${map.size} fixtures`);
  return map;
}

// Get completed fixture API IDs
async function getCompletedFixtureIds(): Promise<number[]> {
  const { data } = await supabase
    .from('fixtures')
    .select('api_id')
    .in('status', ['FT', 'AET', 'PEN']);
  return (data || []).map(f => f.api_id);
}

// =====================================================
// 1. IMPORT INJURIES
// =====================================================
async function importInjuries(teamMap: Map<number, string>) {
  console.log('\n=== 1. Importing Injuries ===\n');

  const data = await fetchAPI(`/injuries?league=${LEAGUE_ID}&season=${SEASON}`);

  if (!data.response || data.response.length === 0) {
    console.log('No injuries found');
    return;
  }

  console.log(`Found ${data.response.length} injury records`);
  let imported = 0;

  for (const item of data.response) {
    const player = item.player;
    const team = item.team;
    const teamId = teamMap.get(team.id);

    if (!teamId) continue;

    const { error } = await supabase
      .from('injuries')
      .upsert({
        team_id: teamId,
        player_name: player.name,
        player_id: player.id,
        type: player.type,
        reason: player.reason,
      }, { onConflict: 'team_id,player_name' });

    if (!error) {
      imported++;
    }
  }

  console.log(`✓ Imported ${imported} injuries`);
}

// =====================================================
// 2. IMPORT FIXTURE EVENTS (Goals, Cards, Subs)
// =====================================================
async function importFixtureEvents(
  fixtureMap: Map<number, string>,
  teamMap: Map<number, string>,
  completedIds: number[]
) {
  console.log('\n=== 2. Importing Fixture Events ===\n');

  // Process in batches of 10
  const chunks: number[][] = [];
  for (let i = 0; i < completedIds.length; i += 10) {
    chunks.push(completedIds.slice(i, i + 10));
  }

  let totalEvents = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing batch ${i + 1}/${chunks.length} (${chunk.length} fixtures)`);

    for (const fixtureApiId of chunk) {
      await delay(300);

      try {
        const data = await fetchAPI(`/fixtures/events?fixture=${fixtureApiId}`);

        if (!data.response || data.response.length === 0) continue;

        const fixtureId = fixtureMap.get(fixtureApiId);
        if (!fixtureId) continue;

        for (const event of data.response) {
          const teamId = teamMap.get(event.team?.id);

          const { error } = await supabase
            .from('fixture_events')
            .upsert({
              fixture_id: fixtureId,
              team_id: teamId,
              time_elapsed: event.time?.elapsed,
              time_extra: event.time?.extra,
              type: event.type,
              detail: event.detail,
              player_name: event.player?.name,
              player_id: event.player?.id,
              assist_name: event.assist?.name,
              assist_id: event.assist?.id,
              comments: event.comments,
            }, { onConflict: 'fixture_id,time_elapsed,type,player_name' });

          if (!error) totalEvents++;
        }
      } catch (err) {
        console.error(`Error for fixture ${fixtureApiId}:`, err);
      }
    }

    // Limit to first 50 fixtures for now to avoid API limits
    if (i >= 4) {
      console.log('Stopping at 50 fixtures to conserve API calls');
      break;
    }
  }

  console.log(`✓ Imported ${totalEvents} fixture events`);
}

// =====================================================
// 3. IMPORT HEAD-TO-HEAD
// =====================================================
async function importH2H(teamMap: Map<number, string>) {
  console.log('\n=== 3. Importing Head-to-Head Records ===\n');

  const teamApiIds = Array.from(teamMap.keys());
  const pairs: [number, number][] = [];

  // Generate unique team pairs
  for (let i = 0; i < teamApiIds.length; i++) {
    for (let j = i + 1; j < teamApiIds.length; j++) {
      pairs.push([teamApiIds[i], teamApiIds[j]]);
    }
  }

  console.log(`Processing ${pairs.length} team pairs`);
  let imported = 0;

  // Limit to first 50 pairs to conserve API calls
  const limitedPairs = pairs.slice(0, 50);

  for (let i = 0; i < limitedPairs.length; i++) {
    const [team1ApiId, team2ApiId] = limitedPairs[i];
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

      if (!error) {
        imported++;
        console.log(`  ✓ H2H ${i + 1}/${limitedPairs.length}`);
      }
    } catch (err) {
      // Continue on error
    }
  }

  console.log(`✓ Imported ${imported} H2H records`);
}

// =====================================================
// 4. IMPORT TRANSFERS
// =====================================================
async function importTransfers(teamMap: Map<number, string>) {
  console.log('\n=== 4. Importing Transfers ===\n');

  let imported = 0;
  const teamApiIds = Array.from(teamMap.keys()).slice(0, 10); // Limit to 10 teams

  for (const apiId of teamApiIds) {
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

        for (const transfer of recentTransfers.slice(0, 3)) {
          const fromTeamId = teamMap.get(transfer.teams?.out?.id);
          const toTeamId = teamMap.get(transfer.teams?.in?.id);

          const { error } = await supabase
            .from('transfers')
            .upsert({
              player_api_id: player.id,
              player_name: player.name,
              from_team_id: fromTeamId,
              from_team_name: transfer.teams?.out?.name,
              to_team_id: toTeamId,
              to_team_name: transfer.teams?.in?.name,
              transfer_date: transfer.date,
              transfer_type: transfer.type,
            }, { onConflict: 'player_api_id,transfer_date' });

          if (!error) imported++;
        }
      }
    } catch (err) {
      console.error(`Error for team ${apiId}:`, err);
    }
  }

  console.log(`✓ Imported ${imported} transfers`);
}

// =====================================================
// MAIN
// =====================================================
async function main() {
  console.log('=========================================');
  console.log('   TARGETED IMPORT: Missing Data Only   ');
  console.log('=========================================\n');

  const startTime = Date.now();

  try {
    // Load existing mappings
    console.log('Loading existing data mappings...\n');
    const teamMap = await getTeamMap();
    const playerMap = await getPlayerMap();
    const fixtureMap = await getFixtureMap();
    const completedIds = await getCompletedFixtureIds();

    console.log(`\nFound ${completedIds.length} completed fixtures\n`);

    // 1. Injuries
    await importInjuries(teamMap);
    await delay(500);

    // 2. Fixture Events
    await importFixtureEvents(fixtureMap, teamMap, completedIds);
    await delay(500);

    // 3. Head-to-Head
    await importH2H(teamMap);
    await delay(500);

    // 4. Transfers
    await importTransfers(teamMap);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n=========================================');
    console.log(`   IMPORT COMPLETE - ${duration}s`);
    console.log(`   Total API calls: ${apiCallCount}`);
    console.log('=========================================\n');

  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  }
}

main();
