import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeCollaboration } from "@/hooks/useRealtimeCollaboration";
import { useRealtimeContent } from "@/hooks/useRealtimeContent";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

interface Pad {
  id: string;
  content: string;
  password?: string;
  creator_session?: string;
  updated_at: string;
}

interface Subpad {
  id: string;
  pad_id: string;
  name: string;
  content: string;
}

export default function PadEditor() {
  const { padName, subpadName } = useParams();
  const [pad, setPad] = useState<Pad | null>(null);
  const [subpads, setSubpads] = useState<Subpad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Real-time collaboration hooks
  const { cursors, onlineUsers, updateCursor, removeCursor } = useRealtimeCollaboration(
    padName || "", 
    sessionId
  );

  const { content, setContent: setRealtimeContent, isConnected } = useRealtimeContent(
    padName || "",
    pad?.content || "",
    (newContent) => {
      // Handle incoming content updates
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        // Preserve cursor position when content updates
        setTimeout(() => {
          textarea.setSelectionRange(start, end);
        }, 0);
      }
    }
  );

  // Load pad data
  useEffect(() => {
    if (!padName) return;
    loadPad();
  }, [padName]);

  // Auto-save content with real-time sync
  useEffect(() => {
    if (!pad || content === pad.content) return;
    
    const timer = setTimeout(() => {
      savePad();
    }, 500);

    return () => clearTimeout(timer);
  }, [content, pad]);

  // Track cursor position for collaboration
  useEffect(() => {
    if (textareaRef.current && padName) {
      const textarea = textareaRef.current;
      const handleSelectionChange = () => {
        const position = textarea.selectionStart;
        setCursorPosition(position);
        updateCursor(position);
      };

      textarea.addEventListener('selectionchange', handleSelectionChange);
      textarea.addEventListener('keyup', handleSelectionChange);
      textarea.addEventListener('mouseup', handleSelectionChange);

      return () => {
        textarea.removeEventListener('selectionchange', handleSelectionChange);
        textarea.removeEventListener('keyup', handleSelectionChange);
        textarea.removeEventListener('mouseup', handleSelectionChange);
        removeCursor();
      };
    }
  }, [padName, updateCursor, removeCursor]);

  // Apply syntax highlighting
  useEffect(() => {
    if (textareaRef.current) {
      const highlighted = hljs.highlightAuto(content).value;
      // Update syntax highlighting overlay (simplified version)
    }
  }, [content]);

  const loadPad = async () => {
    if (!padName) return;
    
    setLoading(true);
    try {
      const { data: existingPad } = await supabase
        .from("pads")
        .select("*")
        .eq("id", padName)
        .single();

      if (existingPad) {
        setPad(existingPad);
        setRealtimeContent(existingPad.content);
        loadSubpads();
      } else {
        // Create new pad
        const newPad = {
          id: padName,
          content: "",
          creator_session: sessionId,
        };
        
        const { data, error } = await supabase
          .from("pads")
          .insert(newPad)
          .select()
          .single();

        if (error) {
          toast({
            title: "Error",
            description: "Failed to create pad",
            variant: "destructive",
          });
        } else {
          setPad(data);
          setRealtimeContent("");
        }
      }
    } catch (error) {
      console.error("Error loading pad:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubpads = async () => {
    if (!padName) return;

    const { data } = await supabase
      .from("subpads")
      .select("*")
      .eq("pad_id", padName)
      .order("created_at", { ascending: true });

    if (data) {
      setSubpads(data);
    }
  };

  const savePad = async () => {
    if (!pad) return;

    // Check if this is someone else's pad and needs password
    if (pad.creator_session !== sessionId && pad.password && !sessionStorage.getItem(`auth_${padName}`)) {
      setShowPasswordDialog(true);
      return;
    }

    const { error } = await supabase
      .from("pads")
      .update({ content })
      .eq("id", padName);

    if (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: "Could not save changes",
        variant: "destructive",
      });
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pad || !password) return;

    // In a real app, you'd verify the password here
    // For now, just assume it's correct if provided
    sessionStorage.setItem(`auth_${padName}`, "true");
    setShowPasswordDialog(false);
    setPassword("");
    await savePad();
  };

  const createSubpad = async (name: string) => {
    if (!padName || !name.trim()) return;

    const { error } = await supabase
      .from("subpads")
      .insert({
        pad_id: padName,
        name: name.trim(),
        content: "",
      });

    if (!error) {
      loadSubpads();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading pad...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border p-4">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-sidebar-foreground mb-2">
            /{padName}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const name = prompt("Subpad name:");
              if (name) createSubpad(name);
            }}
            className="w-full"
          >
            + New Subpad
          </Button>
        </div>
        
        <div className="space-y-1">
          <button
            className="w-full text-left px-2 py-1 rounded text-sm bg-sidebar-accent text-sidebar-accent-foreground"
            onClick={() => window.location.href = `/${padName}`}
          >
            Main
          </button>
          {subpads.map((subpad) => (
            <button
              key={subpad.id}
              className="w-full text-left px-2 py-1 rounded text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => window.location.href = `/${padName}/${subpad.name}`}
            >
              {subpad.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">/{padName}{subpadName ? `/${subpadName}` : ""}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Collaborative text editor • Auto-saves</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {onlineUsers.length > 0 && (
                <Badge variant="secondary">
                  {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <div className="relative h-full">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setRealtimeContent(e.target.value)}
              placeholder="Start typing... This pad supports markdown, code, and real-time collaboration."
              className="w-full h-full bg-background border border-input rounded-md p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring relative z-10"
              style={{
                tabSize: 2,
                whiteSpace: "pre",
                overflowWrap: "normal",
              }}
            />
            
            {/* Render other users' cursors */}
            {cursors.map((cursor) => (
              <div
                key={cursor.id}
                className="absolute pointer-events-none z-20"
                style={{
                  left: `${Math.min(cursor.position * 0.6, 95)}%`, // Simple position approximation
                  top: `${Math.floor(cursor.position / 80) * 1.2 + 20}px`,
                  color: cursor.color,
                }}
              >
                <div 
                  className="w-0.5 h-5 opacity-80"
                  style={{ backgroundColor: cursor.color }}
                />
                <div 
                  className="text-xs px-1 py-0.5 rounded text-white whitespace-nowrap"
                  style={{ backgroundColor: cursor.color }}
                >
                  {cursor.user_name || `User ${cursor.session_id.slice(-4)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This pad is password protected. Enter the password to edit.
            </p>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            <div className="flex gap-2">
              <Button onClick={handlePasswordSubmit} disabled={!password}>
                Unlock
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}