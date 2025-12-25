import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TABLES = [
  'leagues', 'venues', 'teams', 'fixtures', 'standings',
  'team_season_stats', 'fixture_statistics', 'fixture_events',
  'injuries', 'predictions', 'odds', 'weather', 'referee_stats',
  'lineups', 'head_to_head', 'players', 'player_season_stats',
  'player_match_stats', 'coaches', 'transfers', 'top_performers',
  'api_predictions', 'player_squads'
]

async function auditTable(tableName: string) {
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .limit(100)
  
  if (error) {
    return { table: tableName, error: error.message, count: 0, nullColumns: [] }
  }
  
  if (!data || data.length === 0) {
    return { table: tableName, count: 0, nullColumns: [], message: 'Empty table' }
  }
  
  const columns = Object.keys(data[0])
  const nullAnalysis: Record<string, { nullCount: number, total: number, percentage: number }> = {}
  
  for (const col of columns) {
    const nullCount = data.filter(row => row[col] === null || row[col] === undefined).length
    if (nullCount > 0) {
      nullAnalysis[col] = {
        nullCount,
        total: data.length,
        percentage: Math.round((nullCount / data.length) * 100)
      }
    }
  }
  
  return {
    table: tableName,
    count: count || data.length,
    sampleSize: data.length,
    nullColumns: Object.entries(nullAnalysis)
      .filter(([_, v]) => v.percentage > 0)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .map(([col, stats]) => ({ col, ...stats }))
  }
}

async function main() {
  console.log('=== DATABASE NULL VALUE AUDIT ===\n')
  
  for (const table of TABLES) {
    const result = await auditTable(table)
    
    console.log('\n' + table.toUpperCase())
    console.log('Records:', result.count)
    
    if (result.error) {
      console.log('Error:', result.error)
    } else if (result.message) {
      console.log(result.message)
    } else if (result.nullColumns.length === 0) {
      console.log('No NULL values found')
    } else {
      console.log('Columns with NULLs:')
      for (const col of result.nullColumns) {
        console.log('  -', col.col + ':', col.percentage + '% null (' + col.nullCount + '/' + col.total + ')')
      }
    }
  }
}

main()
