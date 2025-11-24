-- Create storage bucket for agent-generated files
-- This bucket will store files created by the OpenAI agent (code interpreter outputs)

-- Create the bucket (public for easy download access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-files', 'agent-files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Users can upload files to their own folders
CREATE POLICY "Users can upload their own agent files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: All files are publicly readable (for easy sharing/download)
CREATE POLICY "Agent files are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agent-files');

-- RLS Policy: Users can delete their own files
CREATE POLICY "Users can delete their own agent files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
