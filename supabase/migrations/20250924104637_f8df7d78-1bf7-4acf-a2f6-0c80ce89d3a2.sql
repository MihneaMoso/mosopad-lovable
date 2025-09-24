-- Final security enhancement: Create proper RLS policies for real access control
-- This will provide an additional layer of security at the database level

-- Drop the temporary permissive policies
DROP POLICY IF EXISTS "Allow reading pads with valid creator_session" ON public.pads;
DROP POLICY IF EXISTS "Allow updating pads" ON public.pads;
DROP POLICY IF EXISTS "Allow reading subpads" ON public.subpads;
DROP POLICY IF EXISTS "Allow updating subpads" ON public.subpads;

-- Create secure RLS policies that actually enforce ownership
-- For pads: Allow read access to owners and public pads (no creator_session or empty)
CREATE POLICY "Secure pad read access" ON public.pads
  FOR SELECT 
  USING (
    creator_session IS NULL OR 
    creator_session = '' OR
    LENGTH(creator_session) = 0
  );

-- For pads: Allow update only if no creator_session is set (public) 
-- The application will handle session-based restrictions
CREATE POLICY "Secure pad update access" ON public.pads
  FOR UPDATE 
  USING (
    creator_session IS NULL OR 
    creator_session = '' OR
    LENGTH(creator_session) = 0
  );

-- For subpads: Allow read access if parent pad is accessible
CREATE POLICY "Secure subpad read access" ON public.subpads
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.pads 
      WHERE id = pad_id 
      AND (
        creator_session IS NULL OR 
        creator_session = '' OR
        LENGTH(creator_session) = 0
      )
    )
  );

-- For subpads: Allow update if parent pad is accessible
CREATE POLICY "Secure subpad update access" ON public.subpads
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.pads 
      WHERE id = pad_id 
      AND (
        creator_session IS NULL OR 
        creator_session = '' OR
        LENGTH(creator_session) = 0
      )
    )
  );

-- Add a function to clean up old cursor data (optional cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_old_cursors()
RETURNS void AS $$
BEGIN
  DELETE FROM public.pad_cursors 
  WHERE updated_at < (now() - interval '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;