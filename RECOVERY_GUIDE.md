# Recovery Guide: Setting Up From a Fresh Clone

If you lose your local files and need to recover from GitHub, follow these steps:

## 1. Clone the Repository

```bash
git clone https://github.com/luisaliboni/math_tai.git
cd math_tai/UI
```

## 2. Install Dependencies

```bash
npm install
```

This will recreate the `node_modules` folder (365MB) from `package.json` and `package-lock.json`.

## 3. Set Up Environment Variables (CRITICAL!)

Create a `.env.local` file in the `UI` directory with your API keys:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and fill in your actual values:

### Supabase Keys (Get from Supabase Dashboard)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### OpenAI API Key (Get from OpenAI Platform)
1. Go to https://platform.openai.com/api-keys
2. Create a new key or use existing one
3. Copy → `OPENAI_API_KEY`

## 4. Set Up Supabase Database

Run the SQL scripts in order:

```bash
# In Supabase SQL Editor, run these files in order:
1. supabase-setup.sql          # Creates tables
2. supabase-conversations.sql   # Adds conversations support
3. supabase-conversations-service-role.sql  # Fixes RLS policies
```

Or run the setup script (if you have Node.js):

```bash
node scripts/setup-database.js
```

## 5. Start the Development Server

```bash
npm run dev
```

The app should now be running at http://localhost:3000

## What Files Are NOT in Git (and Why)

### Ignored for Security:
- `.env.local` - Contains your **secret** API keys
- `.env` - Alternative env file

### Ignored for Size/Build Artifacts:
- `node_modules/` - 365MB, recreated from `package.json`
- `.next/` - Build output, regenerated on `npm run dev`
- `.npm-cache/` - Temporary cache files

### Ignored for OS/IDE:
- `.DS_Store` - macOS metadata
- `.vscode/`, `.idea/` - IDE settings

## Critical Files That ARE in Git

✅ `package.json` - Defines all dependencies
✅ `package-lock.json` - Locks dependency versions
✅ `.env.example` - Template for environment variables
✅ All source code (`agents/`, `app/`, `components/`, `lib/`)
✅ SQL setup scripts
✅ Documentation

## Emergency: I Lost My API Keys!

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Delete the old key (if compromised)
3. Create a new key
4. Update `.env.local`

### Supabase Keys
1. Your Supabase project keys don't change
2. Go to https://supabase.com/dashboard
3. Find your project
4. Copy keys from Settings → API

## Backup Recommendations

### Option 1: Encrypted Backup (Recommended)
Store your `.env.local` in an encrypted location:
- 1Password / LastPass / Bitwarden
- Encrypted USB drive
- Encrypted cloud storage (not public!)

### Option 2: Google Drive Backup
Your files are in Google Drive already:
```
/Users/luisaliboni/Insync/luisa.liboni@gmail.com/Google Drive/Work/Kings/courses/MATH1228/MATHTAi
```

So you have a backup! But be careful - anyone with access to this folder can see your API keys.

### Option 3: Print and Lock Away
Print your `.env.local` file and store it in a safe place.

## Testing Your Recovery

To test if you can recover:

1. Rename your current folder: `mv MATHTAi MATHTAi_backup`
2. Follow steps 1-5 above
3. If it works, you can safely delete the backup

## Common Issues During Recovery

### "Cannot find module" errors
→ Run `npm install` again

### "Invalid API key" errors
→ Check your `.env.local` has correct keys

### Database errors
→ Ensure you ran all SQL setup scripts in Supabase

### "Command not found: npm"
→ Install Node.js from https://nodejs.org/

