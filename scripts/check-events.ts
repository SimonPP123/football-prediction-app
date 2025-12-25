import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkEvents() {
  // Get a real fixture ID
  const { data: fixture } = await supabase
    .from('fixtures')
    .select('id, api_id')
    .in('status', ['FT', 'AET', 'PEN'])
    .limit(1)
    .single()
  
  if (!fixture) {
    console.log('No completed fixtures found')
    return
  }
  
  console.log('Testing with fixture:', fixture.id)
  
  // Try to insert
  const { error } = await supabase.from('fixture_events').upsert({
    fixture_id: fixture.id,
    elapsed: 45,
    type: 'Goal',
    player_name: 'Test Player'
  }, { onConflict: 'fixture_id,elapsed,type,player_name' })
  
  console.log('Insert result:', error?.message || 'success')
  
  // Check if constraint exists
  const { error: err2 } = await supabase.from('fixture_events').upsert({
    fixture_id: fixture.id,
    elapsed: 45,
    type: 'Goal',
    player_name: 'Test Player',
    detail: 'Updated'
  }, { onConflict: 'fixture_id,elapsed,type,player_name' })
  
  console.log('Upsert same row:', err2?.message || 'success')
  
  // Clean up
  await supabase.from('fixture_events').delete().eq('player_name', 'Test Player')
}

checkEvents()
