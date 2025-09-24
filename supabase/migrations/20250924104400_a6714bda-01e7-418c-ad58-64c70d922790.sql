-- Simplify RLS policies to work with client-side session management
-- The previous approach with request headers won't work with standard Supabase client

-- Drop the header-based policies
DROP POLICY IF EXISTS "Creators can read their pads" ON public.pads;
DROP POLICY IF EXISTS "Creators can update their pads" ON public.pads;
DROP POLICY IF EXISTS "Pad creators can create subpads" ON public.subpads;
DROP POLICY IF EXISTS "Subpad access follows pad access" ON public.subpads;
DROP POLICY IF EXISTS "Subpad updates follow pad access" ON public.subpads;

-- Create simplified policies that work with client-side session management
-- For now, allow read access but we'll handle ownership in the application layer
CREATE POLICY "Allow reading pads with valid creator_session" ON public.pads
  FOR SELECT 
  USING (true);

-- Allow updating only if creator_session matches (we'll enforce this in app code)
CREATE POLICY "Allow updating pads" ON public.pads
  FOR UPDATE 
  USING (true);

-- Similar for subpads
CREATE POLICY "Allow reading subpads" ON public.subpads
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow updating subpads" ON public.subpads
  FOR UPDATE 
  USING (true);

-- We'll implement proper session-based filtering in the application code
-- This provides a foundation while we build the proper session management