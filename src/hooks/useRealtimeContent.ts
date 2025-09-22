import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeContentHook {
  content: string;
  setContent: (content: string) => void;
  lastUpdated: string | null;
  isConnected: boolean;
}

export function useRealtimeContent(
  padId: string,
  initialContent: string = "",
  onContentUpdate?: (content: string) => void
): RealtimeContentHook {
  const [content, setContentState] = useState(initialContent);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Set up real-time subscription for content updates
  useEffect(() => {
    if (!padId) return;

    const channel = supabase
      .channel(`pad_content_realtime_${padId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pads',
          filter: `id=eq.${padId}`,
        },
        (payload) => {
          console.log('Real-time content update:', payload);
          
          if (payload.new && payload.new.content !== content) {
            setContentState(payload.new.content);
            setLastUpdated(payload.new.updated_at);
            
            if (onContentUpdate) {
              onContentUpdate(payload.new.content);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [padId, content, onContentUpdate]);

  // Debounced content setter
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
  }, []);

  // Update initial content when it changes
  useEffect(() => {
    if (initialContent !== content) {
      setContentState(initialContent);
    }
  }, [initialContent]);

  return {
    content,
    setContent,
    lastUpdated,
    isConnected,
  };
}