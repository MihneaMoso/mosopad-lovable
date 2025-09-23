import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

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
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
      <Sidebar>
        <SidebarContent>
          <div className="p-4 text-sidebar-foreground">Loading...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed && (
            <h2 className="text-sidebar-foreground font-semibold truncate">
              /{padId}
            </h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInput(true)}
            className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
            title="Add subpad"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showInput && !isCollapsed && (
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
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={!currentSubpad}
                  onClick={() => onSubpadSelect('')}
                >
                  <button className="w-full">
                    <FileText className="h-4 w-4" />
                    {!isCollapsed && <span>Main</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {subpads.map((subpad) => (
                <SidebarMenuItem key={subpad.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentSubpad === subpad.name}
                    onClick={() => onSubpadSelect(subpad.name)}
                  >
                    <button className="w-full">
                      <FileText className="h-4 w-4" />
                      {!isCollapsed && <span className="truncate">{subpad.name}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!isCollapsed && (
          <div className="text-xs text-sidebar-foreground opacity-60 break-all">
            Share: {window.location.host}/{padId}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};