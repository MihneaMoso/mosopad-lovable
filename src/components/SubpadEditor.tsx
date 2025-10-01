import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/hooks/use-toast';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface SubpadEditorProps {
  padId: string;
  subpadName: string;
  onContentChange?: (content: string) => void;
}

export const SubpadEditor = ({ padId, subpadName, onContentChange }: SubpadEditorProps) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const { sessionId } = useSession();
  const { toast } = useToast();

  // Load subpad content and check ownership
  const loadSubpad = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      // Check parent pad ownership
      const { data: padData } = await supabase
        .from('pads')
        .select('creator_session')
        .eq('id', padId)
        .single();

      if (padData) {
        const padIsOwned = padData.creator_session === sessionId;
        const padIsPublic = !padData.creator_session || padData.creator_session === '';
        
        setIsOwner(padIsOwned);
        setIsReadOnly(!padIsOwned && !padIsPublic);
      }

      // Load subpad content
      const { data: subpadData } = await supabase
        .from('subpads')
        .select('content')
        .eq('pad_id', padId)
        .eq('name', subpadName)
        .maybeSingle();

      if (subpadData) {
        setContent(subpadData.content || '');
      }
    } catch (err) {
      console.error('Error loading subpad:', err);
    } finally {
      setLoading(false);
    }
  }, [padId, subpadName, sessionId]);

  // Update subpad content
  const updateSubpad = useCallback(async (newContent: string) => {
    if (isReadOnly) {
      toast({
        title: "Access denied",
        description: "You don't have permission to edit this subpad.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('subpads')
        .update({ content: newContent })
        .eq('pad_id', padId)
        .eq('name', subpadName);
      
      if (error) {
        console.error('Error updating subpad:', error);
        toast({
          title: "Update failed",
          description: "Failed to save changes. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      onContentChange?.(newContent);
    } catch (err) {
      console.error('Error updating subpad:', err);
      toast({
        title: "Update failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  }, [padId, subpadName, onContentChange, isReadOnly, toast]);

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) {
      e.preventDefault();
      return;
    }
    
    const newContent = e.target.value;
    setContent(newContent);
    updateSubpad(newContent);
  };

  // Highlight syntax
  useEffect(() => {
    if (preRef.current && content) {
      const highlighted = hljs.highlightAuto(content);
      preRef.current.innerHTML = highlighted.value;
    } else if (preRef.current) {
      preRef.current.innerHTML = '';
    }
  }, [content]);

  // Load subpad on mount
  useEffect(() => {
    loadSubpad();
  }, [loadSubpad]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`subpad:${padId}:${subpadName}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'subpads',
          filter: `pad_id=eq.${padId}`
        },
        (payload: any) => {
          if (payload.new.name === subpadName && payload.new.content !== content) {
            setContent(payload.new.content);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [padId, subpadName, content]);

  if (loading || !sessionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading subpad...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {isReadOnly && (
        <div className="absolute top-2 right-2 z-20 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-md text-sm border border-amber-200 dark:border-amber-800">
          Read-only
        </div>
      )}
      <div className="relative h-full">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder={isReadOnly ? "This subpad is read-only" : `Start typing in ${subpadName}...`}
          className="absolute inset-0 w-full h-full p-2 md:p-4 bg-transparent text-transparent caret-primary resize-none border-none outline-none font-mono text-sm md:text-base leading-relaxed z-10 touch-manipulation"
          style={{ 
            color: 'transparent', 
            background: 'transparent',
            unicodeBidi: 'plaintext',
            fontFeatureSettings: '"liga" 1, "calt" 1'
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-gramm="false"
          readOnly={isReadOnly}
        />
        <pre
          ref={preRef}
          className="absolute inset-0 w-full h-full p-2 md:p-4 bg-background text-foreground font-mono text-sm md:text-base leading-relaxed overflow-auto pointer-events-none z-0 whitespace-pre-wrap break-words"
          style={{ 
            margin: 0,
            unicodeBidi: 'plaintext',
            fontFeatureSettings: '"liga" 1, "calt" 1'
          }}
        />
      </div>
    </div>
  );
};