# Quick Start Guide

Get your Math Tutor AI app running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- A Supabase account (https://supabase.com)
- An OpenAI API key (https://platform.openai.com)

## Step 1: Get Supabase Keys (2 minutes)

1. Visit: https://supabase.com/dashboard/project/mqwybgxwxcnpcmrqwpxb
2. Click **Settings** (gear icon) → **API**
3. Copy these two values:
   - `anon` `public` key
   - `service_role` `secret` key

## Step 2: Set Up Database (1 minute)

1. In Supabase dashboard, click **SQL Editor**
2. Click **New query**
3. Copy/paste contents of `supabase-setup.sql`
4. Click **Run** (or Cmd/Ctrl + Enter)

## Step 3: Configure Environment (1 minute)

Open `.env.local` and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste your anon public key>
SUPABASE_SERVICE_ROLE_KEY=<paste your service_role secret key>
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

## Step 4: Run the App (1 minute)

```bash
# Install dependencies (if not done yet)
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser!

## Step 5: Test It Out

1. Click **Sign up** and create an account
2. After signing in, you'll see the chat interface
3. Ask a math question like: "Explain Bayes' theorem"
4. Watch the AI respond with LaTeX-rendered equations!

## Deploy to Vercel (Optional)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Then deploy to production
vercel --prod
```

## Troubleshooting

**Can't sign up?**
- Check that you ran the SQL setup script
- Verify Supabase keys are correct

**Agent not responding?**
- Check OpenAI API key is valid
- Ensure you have credits in OpenAI account

**LaTeX not rendering?**
- Clear browser cache
- Check browser console for errors

Need more help? See [README.md](./README.md) or [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
