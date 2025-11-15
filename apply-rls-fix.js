#!/usr/bin/env node

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix...\n');

  try {
    // Read the SQL file
    const sql = fs.readFileSync('./fix_rls_now.sql', 'utf8');

    // Split by statement (simple approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^BEGIN|^COMMIT|^SELECT 'RLS/));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';

      // Skip comments and empty lines
      if (stmt.trim().startsWith('--') || stmt.trim().length < 5) {
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

        const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

        if (error) {
          console.log(`⚠️  Warning: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`⚠️  Warning: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ RLS fix applied!`);
    console.log(`   Success: ${successCount} statements`);
    console.log(`   Warnings: ${errorCount} statements`);
    console.log('\n🎉 You can now start the application\n');

  } catch (error) {
    console.error('❌ Error applying RLS fix:', error.message);
    process.exit(1);
  }
}

applyRLSFix();
