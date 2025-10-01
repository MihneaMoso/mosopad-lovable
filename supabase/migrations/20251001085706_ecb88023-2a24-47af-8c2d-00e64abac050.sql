-- Drop the conflicting policies and create consistent ones
DROP POLICY IF EXISTS "Secure subpad insert access" ON public.subpads;
DROP POLICY IF EXISTS "Allow subpad creation for any session" ON public.subpads;

-- Create proper INSERT policy that matches the logic for read/update access
CREATE POLICY "Subpad insert access" ON public.subpads
  FOR INSERT 
  WITH CHECK (true);

-- Also update the RLS policies for pads to allow creation of pads with creator_session
DROP POLICY IF EXISTS "Anyone can create pads" ON public.pads;
CREATE POLICY "Allow pad creation" ON public.pads
  FOR INSERT 
  WITH CHECK (true);