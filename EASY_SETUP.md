# Super Easy Setup - Follow Along! 🚀

I'll walk you through this step by step. It takes 2 minutes!

## ✅ Step 1: Environment Variables (Already Done!)

Your `.env.local` file is already configured with your Supabase keys. ✓

## 📝 Step 2: Create Database Tables (Do This Now!)

### Follow these exact steps:

1. **Click this link** to open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/mqwybgxwxcnpcmrqwpxb/editor
   ```

2. **Click the "SQL Editor"** button on the left sidebar (it looks like `</>`symbol)

3. **Click "+ New query"** button at the top

4. **Copy the ENTIRE text below** (including the `--` comments):

```sql
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
```

5. **Paste it** into the SQL editor (Cmd+V or Ctrl+V)

6. **Click "Run"** (or press Cmd+Enter on Mac, Ctrl+Enter on Windows)

7. **You should see**: "Success. No rows returned" ✓

### 🎯 That's it! Your database is ready!

---

## 🚀 Step 3: Start Your App

Now run this command in your terminal:

```bash
npm run dev
```

Wait for it to say "Ready" and then:

1. Open your browser
2. Go to: http://localhost:3000
3. Click "Sign up"
4. Create an account with your email
5. Start chatting!

---

## ✅ Verification Checklist

After running the SQL:

- [ ] I went to the SQL Editor
- [ ] I pasted the SQL code
- [ ] I clicked "Run"
- [ ] I saw "Success. No rows returned"
- [ ] I ran `npm run dev`
- [ ] I opened http://localhost:3000
- [ ] I can see the login page

---

## 🆘 Troubleshooting

### "I don't see the SQL Editor"
- Make sure you're logged into Supabase
- Click on your project first
- Look for the `</>` icon on the left sidebar

### "I get an error when running the SQL"
- Make sure you copied the ENTIRE SQL code
- Try clicking "Run" again
- If it says "already exists", that's OK! It means it worked

### "npm run dev doesn't work"
```bash
# Try this:
rm -rf node_modules .next
npm install
npm run dev
```

### "I can't access localhost:3000"
- Make sure you see "Ready" in the terminal
- Try http://127.0.0.1:3000 instead
- Check if another app is using port 3000

---

## 📞 Need Help?

If you're stuck, just tell me:
1. Which step you're on
2. What you see on your screen
3. Any error messages

I'll help you through it! 😊
