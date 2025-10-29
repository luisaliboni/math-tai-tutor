# Supabase Setup Guide

## Step 1: Get Your Supabase API Keys

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/mqwybgxwxcnpcmrqwpxb

2. In the left sidebar, click on **Settings** (gear icon at the bottom)

3. Click on **API** in the settings menu

4. You'll see:
   - **Project URL**: `https://mqwybgxwxcnpcmrqwpxb.supabase.co`
   - **API Keys**:
     - `anon` `public` - This is your public anonymous key
     - `service_role` `secret` - This is your service role key (keep this secret!)

5. Copy these values and update your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mqwybgxwxcnpcmrqwpxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste your anon public key here>
SUPABASE_SERVICE_ROLE_KEY=<paste your service_role secret key here>
```

## Step 2: Set Up Database Tables

1. In your Supabase dashboard, click on **SQL Editor** in the left sidebar

2. Click **New query**

3. Copy the entire contents of the `supabase-setup.sql` file

4. Paste it into the SQL editor

5. Click **Run** (or press Cmd/Ctrl + Enter)

6. You should see a success message. This creates:
   - `chat_history` table - stores all chat messages
   - `documents` table - stores uploaded documents
   - Row Level Security policies - ensures users can only see their own data

## Step 3: Enable Email Authentication (Optional)

If you want to enable email confirmation:

1. Go to **Authentication** > **Providers** in your Supabase dashboard

2. Click on **Email**

3. Configure:
   - **Enable Email provider**: ON
   - **Confirm email**: Toggle based on your preference
   - **Secure email change**: Toggle based on your preference

4. If you enable **Confirm email**, users will need to verify their email before accessing the app

## Step 4: Test Your Setup

1. Make sure your `.env.local` file has the correct values

2. Run `npm run dev`

3. Go to http://localhost:3000

4. Click **Sign up** and create a test account

5. After signing in, you should see the chat interface

6. Send a test message and verify it appears in your Supabase dashboard:
   - Go to **Table Editor**
   - Click on `chat_history`
   - You should see your test message

## Troubleshooting

### "Invalid API key"
- Double-check that you copied the correct keys from the Supabase dashboard
- Make sure there are no extra spaces or line breaks
- Restart your development server after updating `.env.local`

### "relation 'chat_history' does not exist"
- You haven't run the SQL setup script yet
- Go to SQL Editor and run the contents of `supabase-setup.sql`

### "JWT expired" or authentication errors
- Check that your Supabase project is still active
- Verify your API keys haven't been rotated

### Users can see other users' messages
- Row Level Security policies may not be applied
- Re-run the SQL setup script to ensure RLS is enabled
