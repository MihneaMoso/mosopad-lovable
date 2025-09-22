import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FileText, Zap, Users, Lock } from 'lucide-react';

export default function Welcome() {
  const [padName, setPadName] = useState('');
  const navigate = useNavigate();

  const handleCreatePad = () => {
    if (padName.trim()) {
      navigate(`/${padName.trim()}`);
    }
  };

  const handleRandomPad = () => {
    const randomName = Math.random().toString(36).substring(2, 8);
    navigate(`/${randomName}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            MosoPad
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Fast, collaborative text editor. No signup required.
          </p>
        </div>

        <Card className="p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Create or open a pad
              </label>
              <div className="flex gap-2">
                <Input
                  value={padName}
                  onChange={(e) => setPadName(e.target.value)}
                  placeholder="Enter pad name (e.g., 'my-notes')"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePad()}
                />
                <Button onClick={handleCreatePad} disabled={!padName.trim()}>
                  Open Pad
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                URL will be: {window.location.host}/{padName || 'your-pad-name'}
              </p>
            </div>

            <div className="text-center">
              <span className="text-muted-foreground">or</span>
            </div>

            <Button 
              variant="outline" 
              onClick={handleRandomPad}
              className="w-full"
            >
              Create Random Pad
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-foreground">Lightning Fast</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Instant loading and real-time synchronization. No delays, no lag.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-foreground">Collaborative</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Multiple users can edit simultaneously with live cursor tracking.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-foreground">Code Friendly</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Syntax highlighting for code snippets and programming languages.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-foreground">Simple Auth</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Password protection only when needed. Most pads are public.
            </p>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Just like DontPad, but better. Fast, modern, and collaborative.
          </p>
        </div>
      </div>
    </div>
  );
}