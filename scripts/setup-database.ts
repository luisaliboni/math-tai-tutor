#!/usr/bin/env ts-node
/**
 * Automated Supabase Database Setup Script
 * This script creates all necessary tables and policies
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key (admin access)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Starting Supabase database setup...\n');

  try {
    // SQL to create tables and policies
    const setupSQL = `
      -- Create chat_history table
      CREATE TABLE IF NOT EXISTS chat_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for faster queries
      CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

      -- Enable Row Level Security
      ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own chat history" ON chat_history;
      DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_history;

      -- Create policies
      CREATE POLICY "Users can view their own chat history"
        ON chat_history FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own messages"
        ON chat_history FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      -- Create documents table for file uploads
      CREATE TABLE IF NOT EXISTS documents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index for faster queries
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

      -- Enable Row Level Security
      ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
      DROP POLICY IF EXISTS "Users can upload their own documents" ON documents;
      DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

      -- Create policies for documents
      CREATE POLICY "Users can view their own documents"
        ON documents FOR SELECT
        USING (auth.uid() = user_id);

      CREATE POLICY "Users can upload their own documents"
        ON documents FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own documents"
        ON documents FOR DELETE
        USING (auth.uid() = user_id);
    `;

    console.log('📝 Creating tables and policies...');

    const { error } = await supabase.rpc('exec_sql', { sql: setupSQL });

    if (error) {
      // If the RPC doesn't exist, try executing directly via REST API
      console.log('⚠️  Using alternative setup method...');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql: setupSQL })
      });

      if (!response.ok) {
        throw new Error('Failed to execute SQL. You may need to run the SQL manually in Supabase SQL Editor.');
      }
    }

    console.log('✅ Tables created successfully!');
    console.log('✅ Row Level Security enabled!');
    console.log('✅ Policies configured!\n');

    // Verify tables exist
    console.log('🔍 Verifying setup...');

    const { data: tables, error: verifyError } = await supabase
      .from('chat_history')
      .select('id')
      .limit(0);

    if (verifyError && !verifyError.message.includes('no rows')) {
      throw new Error(`Verification failed: ${verifyError.message}`);
    }

    console.log('✅ chat_history table verified');

    const { data: docTables, error: docError } = await supabase
      .from('documents')
      .select('id')
      .limit(0);

    if (docError && !docError.message.includes('no rows')) {
      throw new Error(`Verification failed: ${docError.message}`);
    }

    console.log('✅ documents table verified\n');

    console.log('🎉 Database setup complete!\n');
    console.log('Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Open: http://localhost:3000');
    console.log('3. Sign up and start chatting!\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.error('\n📋 Manual setup required:');
    console.error('1. Go to: https://supabase.com/dashboard/project/mqwybgxwxcnpcmrqwpxb/editor');
    console.error('2. Click "SQL Editor"');
    console.error('3. Copy and paste the contents of supabase-setup.sql');
    console.error('4. Click "Run" or press Cmd/Ctrl + Enter\n');
    process.exit(1);
  }
}

setupDatabase();
