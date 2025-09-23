-- Fix security issue: Add proper RLS policies for session-based ownership

-- First, add creator_session to subpads table for consistency
ALTER TABLE public.subpads ADD COLUMN creator_session text;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Pads are publicly readable" ON public.pads;
DROP POLICY IF EXISTS "Anyone can create pads" ON public.pads;
DROP POLICY IF EXISTS "Anyone can update pads" ON public.pads;

DROP POLICY IF EXISTS "Subpads are publicly readable" ON public.subpads;
DROP POLICY IF EXISTS "Anyone can create subpads" ON public.subpads;
DROP POLICY IF EXISTS "Anyone can update subpads" ON public.subpads;

-- Create secure policies for pads
-- Allow creating pads (anyone can create, but they become the owner)
CREATE POLICY "Anyone can create pads" ON public.pads
  FOR INSERT 
  WITH CHECK (true);

-- Allow reading pads only if you're the creator or if no creator is set (public pads)
CREATE POLICY "Creators can read their pads" ON public.pads
  FOR SELECT 
  USING (
    creator_session IS NULL OR 
    creator_session = current_setting('request.headers')::json->>'x-session-id' OR
    creator_session = ''
  );

-- Allow updating pads only if you're the creator
CREATE POLICY "Creators can update their pads" ON public.pads
  FOR UPDATE 
  USING (
    creator_session = current_setting('request.headers')::json->>'x-session-id' OR
    (creator_session IS NULL AND current_setting('request.headers')::json->>'x-session-id' IS NOT NULL)
  );

-- Create secure policies for subpads  
-- Allow creating subpads if you can access the parent pad
CREATE POLICY "Pad creators can create subpads" ON public.subpads
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pads 
      WHERE id = pad_id 
      AND (
        creator_session IS NULL OR 
        creator_session = current_setting('request.headers')::json->>'x-session-id' OR
        creator_session = ''
      )
    )
  );

-- Allow reading subpads if you can access the parent pad
CREATE POLICY "Subpad access follows pad access" ON public.subpads
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.pads 
      WHERE id = pad_id 
      AND (
        creator_session IS NULL OR 
        creator_session = current_setting('request.headers')::json->>'x-session-id' OR
        creator_session = ''
      )
    )
  );

-- Allow updating subpads if you can access the parent pad
CREATE POLICY "Subpad updates follow pad access" ON public.subpads
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.pads 
      WHERE id = pad_id 
      AND (
        creator_session IS NULL OR 
        creator_session = current_setting('request.headers')::json->>'x-session-id' OR
        creator_session = ''
      )
    )
  );

-- Update existing subpads to inherit creator_session from their parent pad
UPDATE public.subpads 
SET creator_session = (
  SELECT creator_session 
  FROM public.pads 
  WHERE pads.id = subpads.pad_id
);

-- Add an index for better performance on creator_session lookups
CREATE INDEX IF NOT EXISTS idx_pads_creator_session ON public.pads(creator_session);
CREATE INDEX IF NOT EXISTS idx_subpads_creator_session ON public.subpads(creator_session);