import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Cursor {
  id: string;
  session_id: string;
  user_name: string | null;
  position: number;
  color: string;
  updated_at: string;
}

interface CollaborationState {
  cursors: Cursor[];
  onlineUsers: string[];
}

export function useRealtimeCollaboration(padId: string, sessionId: string) {
  const [state, setState] = useState<CollaborationState>({
    cursors: [],
    onlineUsers: [],
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!padId) return;

    // Subscribe to cursor updates
    const cursorChannel = supabase
      .channel(`pad_cursors_${padId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pad_cursors',
          filter: `pad_id=eq.${padId}`,
        },
        (payload) => {
          console.log('Cursor update:', payload);
          loadCursors();
        }
      )
      .subscribe();

    // Subscribe to content updates
    const contentChannel = supabase
      .channel(`pad_content_${padId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pads',
          filter: `id=eq.${padId}`,
        },
        (payload) => {
          console.log('Content update:', payload);
          // Notify parent component about content changes
        }
      )
      .subscribe();

    // Load initial cursors
    loadCursors();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(cursorChannel);
      supabase.removeChannel(contentChannel);
    };
  }, [padId]);

  const loadCursors = async () => {
    if (!padId) return;

    const { data } = await supabase
      .from('pad_cursors')
      .select('*')
      .eq('pad_id', padId)
      .gte('updated_at', new Date(Date.now() - 30000).toISOString()); // Only cursors from last 30 seconds

    if (data) {
      setState(prev => ({
        ...prev,
        cursors: data,
        onlineUsers: [...new Set(data.map(c => c.session_id))],
      }));
    }
  };

  const updateCursor = async (position: number, userName?: string) => {
    if (!padId) return;

    const cursorColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

    await supabase
      .from('pad_cursors')
      .upsert({
        pad_id: padId,
        session_id: sessionId,
        user_name: userName || `User ${sessionId.slice(-4)}`,
        position,
        color: cursorColor,
      }, {
        onConflict: 'pad_id,session_id',
      });
  };

  const removeCursor = async () => {
    if (!padId) return;

    await supabase
      .from('pad_cursors')
      .delete()
      .match({ pad_id: padId, session_id: sessionId });
  };

  return {
    cursors: state.cursors.filter(c => c.session_id !== sessionId), // Exclude own cursor
    onlineUsers: state.onlineUsers,
    updateCursor,
    removeCursor,
  };
}