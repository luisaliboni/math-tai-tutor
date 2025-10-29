# Math Tutor AI

A web application for AI-powered math tutoring using OpenAI Agents SDK, built with Next.js, TypeScript, and Supabase.

## Features

- User authentication (login/signup) with Supabase
- Real-time chat interface with AI math tutor
- LaTeX equation rendering with KaTeX
- Per-user chat history storage
- Document upload capability
- Responsive design
- Easy to deploy on Vercel

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: TailwindCSS
- **Authentication & Database**: Supabase
- **AI Agent**: OpenAI Agents SDK
- **Math Rendering**: KaTeX
- **Deployment**: Vercel

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to your Supabase project: https://supabase.com/dashboard/project/mqwybgxwxcnpcmrqwpxb
2. Go to **SQL Editor** in the left sidebar
3. Copy and paste the contents of `supabase-setup.sql` and run it
4. Go to **Settings** > **API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (be careful with this one!)

### 3. Configure Environment Variables

Update the `.env.local` file with your Supabase keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mqwybgxwxcnpcmrqwpxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Modifying the AI Agent

The AI agent workflow is located in `agents/workflow.ts`. You can modify:

- **Agent instructions**: Change the `instructions` field
- **Model**: Change the `model` field (e.g., "gpt-4o", "gpt-4-turbo")
- **Tools**: Add or remove tools (webSearch, codeInterpreter)
- **Output schema**: Modify the `MyAgentSchema` to match your needs

Example:

```typescript
const myAgent = new Agent({
  name: "Math Tutor AI",
  instructions: `Your custom instructions here...`,
  model: "gpt-4o",
  tools: [webSearchPreview, codeInterpreter],
  outputType: MyAgentSchema,
  // ... other settings
});
```

## Deploying to Vercel

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
vercel
```

Follow the prompts. Vercel will:
- Link your project
- Set up the deployment
- Deploy your application

### 3. Add Environment Variables

After deploying, add your environment variables in the Vercel dashboard:

1. Go to your project on Vercel
2. Click **Settings** > **Environment Variables**
3. Add each variable from `.env.local`

### 4. Redeploy

```bash
vercel --prod
```

## Project Structure

```
.
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── chat/          # Chat endpoint
│   │   └── chat-history/  # Chat history endpoint
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── chat/              # Main chat interface
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (redirects)
│   └── globals.css        # Global styles
├── agents/                 # AI agent configuration
│   └── workflow.ts        # Agent workflow (MODIFY THIS)
├── components/            # React components
│   ├── ChatInterface.tsx  # Main chat component
│   └── LatexRenderer.tsx  # LaTeX rendering component
├── lib/                   # Utility libraries
│   └── supabase.ts        # Supabase client
├── .env.local            # Environment variables
├── supabase-setup.sql    # Database setup SQL
└── package.json          # Dependencies
```

## Usage

1. **Sign Up**: Create a new account at `/signup`
2. **Log In**: Sign in at `/login`
3. **Chat**: Ask math questions and get AI-powered responses with LaTeX-rendered equations
4. **Chat History**: Your conversation history is saved and will persist across sessions

## Features to Add

- [ ] Document upload and processing
- [ ] Export chat history
- [ ] Multiple conversation threads
- [ ] Streaming responses (character-by-character)
- [ ] Voice input
- [ ] Dark mode
- [ ] Mobile app

## Troubleshooting

### "Agent result is undefined"
- Check your OpenAI API key is valid
- Ensure you have credits in your OpenAI account

### "Failed to fetch chat history"
- Verify your Supabase credentials are correct
- Check that you ran the `supabase-setup.sql` script

### LaTeX not rendering
- Check the console for errors
- Ensure KaTeX CSS is loaded (should be automatic)

## License

MIT
