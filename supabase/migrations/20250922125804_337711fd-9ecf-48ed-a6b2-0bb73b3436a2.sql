-- Create pads table for storing pad content
CREATE TABLE public.pads (
  id TEXT NOT NULL PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  password TEXT,
  creator_session TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subpads table for organizing pads
CREATE TABLE public.subpads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pad_id TEXT NOT NULL REFERENCES public.pads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cursor tracking table for real-time collaboration
CREATE TABLE public.pad_cursors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pad_id TEXT NOT NULL REFERENCES public.pads(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_name TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#ff6b35',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subpads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pad_cursors ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is like dontpad.com)
CREATE POLICY "Pads are publicly readable" 
ON public.pads 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create pads" 
ON public.pads 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update pads" 
ON public.pads 
FOR UPDATE 
USING (true);

CREATE POLICY "Subpads are publicly readable" 
ON public.subpads 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create subpads" 
ON public.subpads 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update subpads" 
ON public.subpads 
FOR UPDATE 
USING (true);

CREATE POLICY "Cursors are publicly readable" 
ON public.pad_cursors 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage cursors" 
ON public.pad_cursors 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_pads_updated_at
BEFORE UPDATE ON public.pads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subpads_updated_at
BEFORE UPDATE ON public.subpads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pad_cursors_updated_at
BEFORE UPDATE ON public.pad_cursors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_pads_id ON public.pads(id);
CREATE INDEX idx_subpads_pad_id ON public.subpads(pad_id);
CREATE INDEX idx_pad_cursors_pad_id ON public.pad_cursors(pad_id);
CREATE INDEX idx_pad_cursors_session ON public.pad_cursors(session_id);