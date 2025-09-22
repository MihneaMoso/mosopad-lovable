import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText } from 'lucide-react';

interface SubPad {
  id: string;
  name: string;
  content: string;
}

interface PadSidebarProps {
  padId: string;
  currentSubpad?: string;
  onSubpadSelect: (subpadName: string) => void;
}

export const PadSidebar = ({ padId, currentSubpad, onSubpadSelect }: PadSidebarProps) => {
  const [subpads, setSubpads] = useState<SubPad[]>([]);
  const [newSubpadName, setNewSubpadName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load subpads
  const loadSubpads = async () => {
    try {
      const { data, error } = await supabase
        .from('subpads')
        .select('*')
        .eq('pad_id', padId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setSubpads(data);
      }
    } catch (err) {
      console.error('Error loading subpads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new subpad
  const createSubpad = async () => {
    if (!newSubpadName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('subpads')
        .insert({
          pad_id: padId,
          name: newSubpadName.trim(),
          content: ''
        })
        .select()
        .single();

      if (!error && data) {
        setSubpads(prev => [...prev, data]);
        setNewSubpadName('');
        setShowInput(false);
        onSubpadSelect(data.name);
      }
    } catch (err) {
      console.error('Error creating subpad:', err);
    }
  };

  useEffect(() => {
    loadSubpads();
  }, [padId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`subpads:${padId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subpads',
          filter: `pad_id=eq.${padId}`
        },
        () => {
          loadSubpads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [padId]);

  if (loading) {
    return (
      <div className="w-64 bg-sidebar border-r border-sidebar-border p-4">
        <div className="text-sidebar-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sidebar-foreground font-semibold">
            /{padId}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInput(true)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showInput && (
          <div className="flex gap-2 mb-4">
            <Input
              value={newSubpadName}
              onChange={(e) => setNewSubpadName(e.target.value)}
              placeholder="Subpad name"
              className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createSubpad();
                if (e.key === 'Escape') setShowInput(false);
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {/* Main pad */}
        <div className="p-2">
          <Button
            variant={!currentSubpad ? "secondary" : "ghost"}
            className={`w-full justify-start text-left ${
              !currentSubpad 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
            onClick={() => onSubpadSelect('')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Main
          </Button>
        </div>

        {/* Subpads */}
        <div className="px-2">
          {subpads.map((subpad) => (
            <Button
              key={subpad.id}
              variant={currentSubpad === subpad.name ? "secondary" : "ghost"}
              className={`w-full justify-start text-left mb-1 ${
                currentSubpad === subpad.name
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
              onClick={() => onSubpadSelect(subpad.name)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {subpad.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground opacity-60">
          Share this pad: {window.location.host}/{padId}
        </div>
      </div>
    </div>
  );
};