import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigration() {
  console.log('Running database migration...\n')

  // We need to run SQL via the Supabase dashboard or use postgres directly
  // Let's use the REST API to execute SQL via the pg_execute function if available
  
  const migrationSQL = `
    -- ADD MISSING COLUMNS TO INJURIES
    ALTER TABLE injuries ADD COLUMN IF NOT EXISTS injury_type TEXT;
    ALTER TABLE injuries ADD COLUMN IF NOT EXISTS injury_reason TEXT;
    ALTER TABLE injuries ADD COLUMN IF NOT EXISTS reported_date DATE;

    -- ADD MISSING COLUMNS TO HEAD_TO_HEAD
    ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0;
    ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS team1_wins INTEGER DEFAULT 0;
    ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS team2_wins INTEGER DEFAULT 0;
    ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS draws INTEGER DEFAULT 0;
    ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS team1_goals INTEGER DEFAULT 0;
    ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS team2_goals INTEGER DEFAULT 0;
  `

  // Try using Supabase's sql function (if available in this version)
  try {
    // First, let's try to add columns one by one using RPC or direct HTTP
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Execute SQL via the Supabase REST API
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey!,
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    })
    
    if (response.ok) {
      console.log('Migration executed successfully via RPC!')
      return
    }
    
    console.log('RPC not available, trying alternative method...')
  } catch (err) {
    console.log('RPC method failed, need to run SQL directly in Supabase dashboard')
  }

  console.log('\n========================================')
  console.log('MANUAL STEP REQUIRED')
  console.log('========================================')
  console.log('Please run this SQL in Supabase SQL Editor:')
  console.log('https://supabase.com/dashboard/project/ypddcrvjeeqavqpcypoa/sql')
  console.log('========================================\n')
  console.log(migrationSQL)
  console.log('\n========================================')
}

runMigration()
