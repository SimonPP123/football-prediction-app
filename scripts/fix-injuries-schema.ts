import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSchema() {
  // Test what columns exist and their types
  console.log('=== Current injuries table structure ===\n')
  
  // Try to insert with INTEGER player_id
  const { error: intError } = await supabase.from('injuries').upsert({
    team_id: '00000000-0000-0000-0000-000000000000',
    player_name: 'test_int',
    player_id: 12345  // Integer
  })
  console.log('Insert with INTEGER player_id:', intError?.message || 'success')
  
  // Try with UUID 
  const { error: uuidError } = await supabase.from('injuries').upsert({
    team_id: '00000000-0000-0000-0000-000000000000', 
    player_name: 'test_uuid',
    player_id: '00000000-0000-0000-0000-000000000001'  // UUID
  })
  console.log('Insert with UUID player_id:', uuidError?.message || 'success')
  
  // Check what the constraint error says
  console.log('\n=== Recommendation ===')
  console.log('The player_id column is INTEGER in the original schema.')
  console.log('The code tries to insert UUIDs (from players.id lookup).')
  console.log('')
  console.log('Fix needed: Run this SQL in Supabase:')
  console.log(`
-- Drop the constraint if it exists
ALTER TABLE injuries DROP CONSTRAINT IF EXISTS injuries_player_date_unique;

-- Rename old column to preserve data
ALTER TABLE injuries RENAME COLUMN player_id TO player_api_id;

-- Add new UUID column
ALTER TABLE injuries ADD COLUMN player_id UUID REFERENCES players(id);

-- Add new constraint
ALTER TABLE injuries ADD CONSTRAINT injuries_player_date_unique 
  UNIQUE (player_id, reported_date);
`)
}

checkSchema()
