import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { PadEditor } from '@/components/PadEditor';
import { PadSidebar } from '@/components/PadSidebar';
import { supabase } from '@/integrations/supabase/client';

export default function Pad() {
  const { padId } = useParams<{ padId: string }>();
  const [currentSubpad, setCurrentSubpad] = useState<string>('');
  const [subpadContent, setSubpadContent] = useState<string>('');

  if (!padId || padId.length === 0) {
    return <Navigate to="/welcome" replace />;
  }

  // Load subpad content when switching
  const handleSubpadSelect = async (subpadName: string) => {
    setCurrentSubpad(subpadName);
    
    if (subpadName) {
      try {
        const { data } = await supabase
          .from('subpads')
          .select('content')
          .eq('pad_id', padId)
          .eq('name', subpadName)
          .single();
        
        if (data) {
          setSubpadContent(data.content);
        }
      } catch (err) {
        console.error('Error loading subpad:', err);
      }
    }
  };

  // Update subpad content
  const handleSubpadContentChange = async (content: string) => {
    if (!currentSubpad) return;
    
    try {
      await supabase
        .from('subpads')
        .update({ content })
        .eq('pad_id', padId)
        .eq('name', currentSubpad);
      
      setSubpadContent(content);
    } catch (err) {
      console.error('Error updating subpad:', err);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <PadSidebar
        padId={padId}
        currentSubpad={currentSubpad}
        onSubpadSelect={handleSubpadSelect}
      />
      
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>/{padId}</span>
            {currentSubpad && (
              <>
                <span>/</span>
                <span>{currentSubpad}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex-1">
          {currentSubpad ? (
            <PadEditor
              key={`${padId}-${currentSubpad}`}
              padId={`${padId}/${currentSubpad}`}
              onContentChange={handleSubpadContentChange}
            />
          ) : (
            <PadEditor
              padId={padId}
            />
          )}
        </div>
      </div>
    </div>
  );
}