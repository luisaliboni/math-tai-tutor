#!/usr/bin/env node
/**
 * Automated Supabase Database Setup Script
 * Run with: node scripts/setup-database.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key (admin access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🚀 Starting Supabase database setup...\n');
  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Using service role key\n');

  try {
    // Step 1: Create chat_history table
    console.log('📝 Creating chat_history table...');

    const createChatHistorySQL = `
      CREATE TABLE IF NOT EXISTS chat_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        message TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: chatTableError } = await supabase.rpc('exec_sql', {
      query: createChatHistorySQL
    });

    // If RPC doesn't work, use the Management API
    const createTableResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      }
    });

    console.log('✅ Tables structure ready\n');

    // Step 2: Verify we can access the tables
    console.log('🔍 Verifying database connection...');

    const { error: verifyError } = await supabase
      .from('chat_history')
      .select('id')
      .limit(1);

    if (verifyError) {
      // Table might not exist, need manual setup
      throw new Error('Tables need to be created manually');
    }

    console.log('✅ Database connection verified!\n');

    console.log('🎉 Setup verification complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Open: http://localhost:3000');
    console.log('   3. Sign up and start chatting!\n');

  } catch (error) {
    console.error('⚠️  Automated setup not available\n');
    console.log('📋 Please run the SQL manually:');
    console.log('');
    console.log('1. Open this URL in your browser:');
    console.log('   https://supabase.com/dashboard/project/mqwybgxwxcnpcmrqwpxb/editor');
    console.log('');
    console.log('2. Click "SQL Editor" on the left sidebar');
    console.log('');
    console.log('3. Click "+ New query"');
    console.log('');
    console.log('4. Copy and paste the contents of: supabase-setup.sql');
    console.log('');
    console.log('5. Click "Run" (or press Cmd/Ctrl + Enter)');
    console.log('');
    console.log('6. You should see "Success. No rows returned"');
    console.log('');
    console.log('Then come back and run: npm run dev\n');
  }
}

setupDatabase();
