-- Fix the function search path security warning
CREATE OR REPLACE FUNCTION public.cleanup_old_cursors()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pad_cursors 
  WHERE updated_at < (now() - interval '1 hour');
END;
$$;