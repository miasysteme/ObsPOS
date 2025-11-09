-- Create public storage bucket for logos and images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public',
  'public',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies

-- Policy 1: Public read access
CREATE POLICY "Public files are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public');

-- Policy 2: Authenticated users can upload
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public');

-- Policy 3: Authenticated users can update
CREATE POLICY "Authenticated users can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'public')
WITH CHECK (bucket_id = 'public');

-- Policy 4: Authenticated users can delete
CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'public');

-- Add comment
COMMENT ON TABLE storage.buckets IS 'Bucket public pour logos établissements et boutiques (5MB max, images seulement)';
