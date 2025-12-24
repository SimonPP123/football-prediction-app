/**
 * Run Extended Database Migration
 *
 * This script applies the extended schema (002) to Supabase.
 * Usage: npx tsx scripts/utils/run-extended-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

async function runMigration() {
  console.log('========================================');
  console.log('Running Extended Database Migration');
  console.log('========================================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Read migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/002_extended_schema.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('Migration file loaded. Executing SQL statements...\n');

  // Split into individual statements
  // Handle DO blocks specially
  const statements: string[] = [];
  let currentStatement = '';
  let inDoBlock = false;

  for (const line of sql.split('\n')) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments at the start of statements
    if (!currentStatement && (trimmedLine === '' || trimmedLine.startsWith('--'))) {
      continue;
    }

    currentStatement += line + '\n';

    // Track DO blocks
    if (trimmedLine.startsWith('DO $$') || trimmedLine.startsWith('DO $')) {
      inDoBlock = true;
    }
    if (inDoBlock && trimmedLine.includes('END $$;')) {
      inDoBlock = false;
      statements.push(currentStatement.trim());
      currentStatement = '';
      continue;
    }

    // Regular statement ends with semicolon
    if (!inDoBlock && trimmedLine.endsWith(';') && !trimmedLine.includes('$$')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  // Filter out empty statements and pure comment blocks
  const validStatements = statements.filter(s => {
    const cleaned = s.split('\n').filter(l => !l.trim().startsWith('--') && l.trim()).join('');
    return cleaned.length > 0;
  });

  console.log(`Found ${validStatements.length} SQL statements to execute\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < validStatements.length; i++) {
    const stmt = validStatements[i];

    // Get first meaningful line for display
    const firstLine = stmt.split('\n').find(l => !l.trim().startsWith('--') && l.trim()) || '';
    const displayName = firstLine.substring(0, 60);

    try {
      // Use raw SQL through postgrest
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });

      if (error) {
        // Check if it's a "already exists" type error
        if (error.message?.includes('already exists') ||
            error.message?.includes('duplicate key') ||
            error.message?.includes('does not exist')) {
          console.log(`${i + 1}. ⏭️  Skipped (already applied): ${displayName}...`);
          skipped++;
        } else if (error.message?.includes('function exec_sql')) {
          // exec_sql RPC doesn't exist, print SQL for manual execution
          console.log(`\n⚠️  RPC 'exec_sql' not available. Please run the SQL manually in Supabase SQL Editor:`);
          console.log(`https://supabase.com/dashboard/project/ypddcrvjeeqavqpcypoa/sql\n`);
          console.log('Copy and paste the contents of:');
          console.log('supabase/migrations/002_extended_schema.sql\n');
          break;
        } else {
          console.log(`${i + 1}. ❌ Error: ${displayName}...`);
          console.log(`   ${error.message}`);
          failed++;
        }
      } else {
        console.log(`${i + 1}. ✅ Success: ${displayName}...`);
        success++;
      }
    } catch (err: any) {
      console.log(`${i + 1}. ❌ ${err.message?.substring(0, 50) || 'Unknown error'}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`Migration Complete: ${success} succeeded, ${skipped} skipped, ${failed} failed`);
  console.log('========================================');

  // Verify tables exist
  console.log('\nVerifying new tables...');

  const tables = ['players', 'player_season_stats', 'player_match_stats', 'coaches', 'transfers', 'top_performers', 'api_predictions', 'player_squads'];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: exists`);
    }
  }
}

runMigration().catch(console.error);
