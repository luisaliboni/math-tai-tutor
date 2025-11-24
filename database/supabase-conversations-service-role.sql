-- Option 1: Disable RLS temporarily (easiest fix for development)
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- If you want to keep RLS enabled but allow service role, use Option 2 instead:
-- DROP the above command and uncomment below:

-- Option 2: Add policy for service role (more secure)
-- DROP POLICY IF EXISTS "Service role can manage all conversations" ON conversations;
-- CREATE POLICY "Service role can manage all conversations"
--   ON conversations
--   USING (true)
--   WITH CHECK (true);
