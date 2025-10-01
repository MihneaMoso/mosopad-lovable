import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { PadEditor } from '@/components/PadEditor';
import { SubpadEditor } from '@/components/SubpadEditor';
import { PadSidebar } from '@/components/PadSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Pad() {
  const { padId } = useParams<{ padId: string }>();
  const [currentSubpad, setCurrentSubpad] = useState<string>('');
  const isMobile = useIsMobile();

  if (!padId || padId.length === 0) {
    return <Navigate to="/welcome" replace />;
  }

  // Load subpad content when switching
  const handleSubpadSelect = (subpadName: string) => {
    setCurrentSubpad(subpadName);
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex h-screen w-full bg-background">
        <PadSidebar
          padId={padId}
          currentSubpad={currentSubpad}
          onSubpadSelect={handleSubpadSelect}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-border p-2 md:p-4 flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <span className="truncate">/{padId}</span>
              {currentSubpad && (
                <>
                  <span>/</span>
                  <span className="truncate">{currentSubpad}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            {currentSubpad ? (
              <SubpadEditor
                key={`${padId}-${currentSubpad}`}
                padId={padId}
                subpadName={currentSubpad}
              />
            ) : (
              <PadEditor
                padId={padId}
              />
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}