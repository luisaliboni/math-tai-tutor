# Setup Checklist

Use this checklist to ensure everything is configured correctly.

## Pre-Launch Checklist

### 1. Environment Setup
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git initialized (already done ✓)

### 2. Supabase Configuration
- [ ] Supabase project exists (✓ mqwybgxwxcnpcmrqwpxb)
- [ ] Obtained `anon` public key
- [ ] Obtained `service_role` secret key
- [ ] Updated `.env.local` with Supabase keys
- [ ] Ran `supabase-setup.sql` in SQL Editor
- [ ] Verified tables created (`chat_history`, `documents`)
- [ ] Row Level Security policies applied

### 3. OpenAI Configuration
- [ ] OpenAI API key obtained (✓ already in `.env.local`)
- [ ] Verified API key has credits
- [ ] Tested API key works

### 4. Dependencies
- [ ] Ran `npm install` successfully
- [ ] No critical vulnerabilities (check with `npm audit`)
- [ ] All packages installed correctly

### 5. Code Configuration
- [ ] Reviewed `agents/workflow.ts` - agent instructions match needs
- [ ] Checked model selection (currently `gpt-4o`)
- [ ] Verified output schema matches requirements
- [ ] Customized welcome messages if needed

### 6. Testing
- [ ] Started dev server (`npm run dev`)
- [ ] Accessed http://localhost:3000
- [ ] Created test account (signup)
- [ ] Logged in successfully
- [ ] Sent test message
- [ ] Verified LaTeX renders correctly
- [ ] Checked message appears in Supabase `chat_history`
- [ ] Logged out and back in - history persists
- [ ] Tested build (`npm run build`) - no errors

### 7. Security
- [ ] `.env.local` is in `.gitignore` (✓)
- [ ] API keys not committed to Git
- [ ] Supabase RLS policies verified
- [ ] Service role key never exposed to client

### 8. Documentation
- [ ] Read [QUICKSTART.md](QUICKSTART.md)
- [ ] Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- [ ] Understand [AGENT_CUSTOMIZATION.md](AGENT_CUSTOMIZATION.md)
- [ ] Know how to modify agent in `agents/workflow.ts`

## Pre-Deployment Checklist

Before deploying to Vercel:

### 9. Vercel Setup
- [ ] Vercel account created
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Ran `vercel` to link project
- [ ] Added environment variables in Vercel dashboard:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `OPENAI_API_KEY`
- [ ] Deployed to production (`vercel --prod`)
- [ ] Verified production URL works

### 10. Production Testing
- [ ] Signup works in production
- [ ] Login works in production
- [ ] Chat works in production
- [ ] LaTeX renders in production
- [ ] Chat history persists in production
- [ ] Mobile responsive (test on phone)

### 11. Optional Features
- [ ] Custom domain configured (if desired)
- [ ] Analytics added (if desired)
- [ ] Email confirmation enabled in Supabase (if desired)
- [ ] Document upload implemented (currently pending)

## Troubleshooting Common Issues

### Can't install dependencies
```bash
# Try with local cache
npm install --cache .npm-cache

# Or clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

### Can't connect to Supabase
- Verify URL is correct: `https://mqwybgxwxcnpcmrqwpxb.supabase.co`
- Check keys are copied correctly (no extra spaces)
- Ensure Supabase project is active (not paused)
- Restart dev server after changing `.env.local`

### OpenAI API errors
- Check API key is valid
- Verify account has credits
- Check model name is correct (`gpt-4o`, not `gpt-5`)
- Try with lower effort level if timeouts occur

### Build fails
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### LaTeX not rendering
- Check KaTeX CSS loaded (open DevTools → Network)
- Verify using correct delimiters (`$...$` or `$$...$$`)
- Clear browser cache
- Check for JavaScript errors in console

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Test production build
npm run start            # Start production server
npm run lint             # Run linter

# Deployment
vercel                   # Deploy preview
vercel --prod            # Deploy production

# Maintenance
npm audit                # Check for vulnerabilities
npm audit fix            # Fix vulnerabilities
npm outdated             # Check for updates
```

## Status Check Script

Run this to verify your setup:

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check if dependencies installed
ls node_modules | wc -l

# Try to build
npm run build

# Check environment variables
cat .env.local | grep -v "KEY="
```

## Final Pre-Launch Checks

Before sharing with users:

- [ ] Application works end-to-end
- [ ] Error handling tested (wrong password, network errors, etc.)
- [ ] UI looks good on desktop and mobile
- [ ] Performance acceptable (responses < 10 seconds)
- [ ] Costs estimated and acceptable
- [ ] Terms of service / privacy policy (if required)
- [ ] Support email or contact method available

## Post-Launch

After users start using:

- [ ] Monitor Supabase usage dashboard
- [ ] Monitor OpenAI API usage
- [ ] Check for errors in Vercel logs
- [ ] Gather user feedback
- [ ] Plan feature additions

---

**Current Status**: ✅ All core features implemented
**Next Step**: Complete items in this checklist
**Need Help**: See [QUICKSTART.md](QUICKSTART.md) or [README.md](README.md)
