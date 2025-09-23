import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface PadEditorProps {
  padId: string;
  onContentChange?: (content: string) => void;
}

interface Cursor {
  id: string;
  position: number;
  color: string;
  user_name?: string;
}

export const PadEditor = ({ padId, onContentChange }: PadEditorProps) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const sessionId = useRef(Math.random().toString(36).substring(7));

  // Load pad content
  const loadPad = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pads')
        .select('content')
        .eq('id', padId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Pad doesn't exist, create it
        const { error: insertError } = await supabase
          .from('pads')
          .insert({ id: padId, content: '', creator_session: sessionId.current });
        
        if (!insertError) {
          setContent('');
        }
      } else if (data) {
        setContent(data.content);
      }
    } catch (err) {
      console.error('Error loading pad:', err);
    } finally {
      setLoading(false);
    }
  }, [padId]);

  // Update pad content
  const updatePad = useCallback(async (newContent: string) => {
    try {
      await supabase
        .from('pads')
        .update({ content: newContent })
        .eq('id', padId);
      
      onContentChange?.(newContent);
    } catch (err) {
      console.error('Error updating pad:', err);
    }
  }, [padId, onContentChange]);

  // Update cursor position
  const updateCursor = useCallback(async (position: number) => {
    try {
      await supabase
        .from('pad_cursors')
        .upsert({
          pad_id: padId,
          session_id: sessionId.current,
          position,
          color: '#10b981'
        });
    } catch (err) {
      console.error('Error updating cursor:', err);
    }
  }, [padId]);

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    updatePad(newContent);
    
    // Update cursor position
    const cursorPos = e.target.selectionStart;
    updateCursor(cursorPos);
  };

  // Handle cursor movement
  const handleCursorMove = () => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart;
      updateCursor(cursorPos);
    }
  };

  // Highlight syntax
  useEffect(() => {
    if (preRef.current && content) {
      const highlighted = hljs.highlightAuto(content);
      preRef.current.innerHTML = highlighted.value;
    }
  }, [content]);

  // Load pad on mount
  useEffect(() => {
    loadPad();
  }, [loadPad]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`pad:${padId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'pads',
          filter: `id=eq.${padId}`
        },
        (payload) => {
          if (payload.new.content !== content) {
            setContent(payload.new.content);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pad_cursors',
          filter: `pad_id=eq.${padId}`
        },
        () => {
          // Reload cursors
          loadCursors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [padId, content]);

  const loadCursors = async () => {
    try {
      const { data } = await supabase
        .from('pad_cursors')
        .select('*')
        .eq('pad_id', padId)
        .neq('session_id', sessionId.current);
      
      if (data) {
        setCursors(data);
      }
    } catch (err) {
      console.error('Error loading cursors:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading pad...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="relative h-full">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onSelect={handleCursorMove}
          onKeyUp={handleCursorMove}
          onClick={handleCursorMove}
          placeholder={`Start typing in ${padId}...`}
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
        
        {/* Render other users' cursors */}
        {cursors.map((cursor) => (
          <div
            key={cursor.id}
            className="editor-cursor-other"
            style={{
              backgroundColor: cursor.color,
              // Position calculation would need more sophisticated logic
              top: '1rem',
              left: `${cursor.position * 0.5 + 1}rem`,
            }}
          >
            {cursor.user_name && (
              <div 
                className="absolute -top-6 left-0 px-2 py-1 text-xs rounded whitespace-nowrap"
                style={{ backgroundColor: cursor.color, color: 'white' }}
              >
                {cursor.user_name}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};