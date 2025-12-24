/**
 * Run Database Migration
 *
 * This script applies the database schema to Supabase.
 * Usage: npx tsx scripts/utils/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function runMigration() {
  console.log('========================================');
  console.log('Running Database Migration');
  console.log('========================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Read migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/001_initial_schema.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split into individual statements (basic split - doesn't handle all edge cases)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Skip comments and empty statements
    if (!stmt || stmt.startsWith('--')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
        if (directError && directError.message.includes('does not exist')) {
          console.log(`Statement ${i + 1}: Skipping (RPC not available)`);
        } else {
          console.log(`Statement ${i + 1}: Error - ${error.message}`);
          failed++;
        }
      } else {
        success++;
      }
    } catch (err: any) {
      console.log(`Statement ${i + 1}: ${err.message?.substring(0, 50) || 'Unknown error'}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`Migration Complete: ${success} succeeded, ${failed} failed`);
  console.log('========================================');

  // Verify by checking if leagues table exists
  const { data, error } = await supabase.from('leagues').select('*').limit(1);

  if (error) {
    console.log('\n⚠️  Tables may not have been created.');
    console.log('Please run the SQL manually in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/ypddcrvjeeqavqpcypoa/sql');
  } else {
    console.log('\n✅ Verified: leagues table exists');
    if (data && data.length > 0) {
      console.log('✅ Premier League record found:', data[0].name);
    }
  }
}

runMigration().catch(console.error);
