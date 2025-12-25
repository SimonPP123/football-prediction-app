import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSchema() {
  // Check injuries table columns
  const { data: injuries, error: injError } = await supabase
    .from('injuries')
    .select('*')
    .limit(1)
  
  console.log('=== INJURIES TABLE ===')
  if (injuries && injuries.length > 0) {
    console.log('Columns:', Object.keys(injuries[0]))
  } else if (injError) {
    console.log('Error:', injError.message)
  } else {
    console.log('Table is empty, checking by insert...')
    const { error } = await supabase.from('injuries').upsert({
      team_id: '00000000-0000-0000-0000-000000000000',
      player_name: 'test',
      injury_type: 'test',
      injury_reason: 'test',
      reported_date: '2025-01-01'
    })
    console.log('Insert test result:', error?.message || 'success')
  }
  
  // Check head_to_head table columns
  const { data: h2h, error: h2hError } = await supabase
    .from('head_to_head')
    .select('*')
    .limit(1)
  
  console.log('\n=== HEAD_TO_HEAD TABLE ===')
  if (h2h && h2h.length > 0) {
    console.log('Columns:', Object.keys(h2h[0]))
  } else if (h2hError) {
    console.log('Error:', h2hError.message)
  } else {
    console.log('Table is empty')
  }
  
  // Check fixture_events table columns  
  const { data: events, error: eventsError } = await supabase
    .from('fixture_events')
    .select('*')
    .limit(1)
  
  console.log('\n=== FIXTURE_EVENTS TABLE ===')
  if (events && events.length > 0) {
    console.log('Columns:', Object.keys(events[0]))
  } else if (eventsError) {
    console.log('Error:', eventsError.message)
  } else {
    console.log('Table is empty')
  }
}

checkSchema()
