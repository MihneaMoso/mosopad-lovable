import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Lock } from 'lucide-react';
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
  const [isOwner, setIsOwner] = useState(false);
  const [padExists, setPadExists] = useState(false);
  const { state } = useSidebar();
  const { sessionId } = useSession();
  const { toast } = useToast();
  const isCollapsed = state === "collapsed";

  // Check pad ownership and load subpads
  const loadPadAndSubpads = async () => {
    if (!sessionId) return;
    
    try {
      // Check pad ownership
      const { data: padData } = await supabase
        .from('pads')
        .select('creator_session')
        .eq('id', padId)
        .single();

      if (padData) {
        setPadExists(true);
        const padIsOwned = padData.creator_session === sessionId;
        const padIsPublic = !padData.creator_session || padData.creator_session === '';
        setIsOwner(padIsOwned || padIsPublic);
      } else {
        setPadExists(false);
        setIsOwner(true); // New pads can be created by anyone
      }

      // Load subpads
      const { data: subpadData, error } = await supabase
        .from('subpads')
        .select('*')
        .eq('pad_id', padId)
        .order('created_at', { ascending: true });

      if (!error && subpadData) {
        setSubpads(subpadData);
      }
    } catch (err) {
      console.error('Error loading pad and subpads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new subpad
  const createSubpad = async () => {
    if (!newSubpadName.trim()) return;
    
    if (!isOwner) {
      toast({
        title: "Access denied",
        description: "You don't have permission to create subpads in this pad.",
        variant: "destructive",
      });
      return;
    }

    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('subpads')
        .insert({
          pad_id: padId,
          name: newSubpadName.trim(),
          content: '',
          creator_session: sessionId
        })
        .select()
        .single();

      if (!error && data) {
        setSubpads(prev => [...prev, data]);
        setNewSubpadName('');
        setShowInput(false);
        onSubpadSelect(data.name);
      } else {
        toast({
          title: "Creation failed",
          description: "Failed to create subpad. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error creating subpad:', err);
      toast({
        title: "Creation failed",
        description: "Failed to create subpad. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadPadAndSubpads();
    }
  }, [padId, sessionId]);

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
          loadPadAndSubpads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [padId]);

  if (loading || !sessionId) {
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
            <div className="flex items-center gap-2">
              <h2 className="text-sidebar-foreground font-semibold truncate">
                /{padId}
              </h2>
              {!isOwner && (
                <div title="Read-only access">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInput(true)}
            className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
            title={isOwner ? "Add subpad" : "Read-only access"}
            disabled={!isOwner}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showInput && !isCollapsed && isOwner && (
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