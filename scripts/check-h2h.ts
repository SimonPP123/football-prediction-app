import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkH2H() {
  // Try inserting with the columns the code uses
  const { error } = await supabase.from('head_to_head').upsert({
    team1_id: '00000000-0000-0000-0000-000000000000',
    team2_id: '00000000-0000-0000-0000-000000000001',
    fixture_data: [],
    matches_played: 5,
    team1_wins: 2,
    team2_wins: 1,
    draws: 2,
    team1_goals: 10,
    team2_goals: 8
  }, { onConflict: 'team1_id,team2_id' })
  
  console.log('H2H insert test:', error?.message || 'success')
  
  // Check what columns injuries has
  console.log('\n=== Testing injuries columns ===')
  const { error: injErr1 } = await supabase.from('injuries').upsert({
    team_id: '00000000-0000-0000-0000-000000000000',
    player_name: 'test',
    type: 'test',  // Try original column name
    reason: 'test' // Try original column name
  })
  console.log('With type/reason:', injErr1?.message || 'success')
}

checkH2H()
