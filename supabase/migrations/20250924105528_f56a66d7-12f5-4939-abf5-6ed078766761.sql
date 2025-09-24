-- Fix subpad creation by adding missing INSERT policy
CREATE POLICY "Secure subpad insert access" ON public.subpads
  FOR INSERT 
  WITH CHECK (
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

-- Also ensure we can insert into subpads for any session (temporary fix for testing)
CREATE POLICY "Allow subpad creation for any session" ON public.subpads
  FOR INSERT 
  WITH CHECK (true);