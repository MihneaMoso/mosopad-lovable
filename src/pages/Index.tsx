// Update this page (the content is just a fallback if you fail to update the page)

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const [padName, setPadName] = useState("");

  const createOrJoinPad = () => {
    if (padName.trim()) {
      window.location.href = `/${padName.trim()}`;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">MosoPad</CardTitle>
          <p className="text-muted-foreground">
            Fast collaborative text editor with real-time sync
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter pad name (e.g. mypad, notes, code)"
              value={padName}
              onChange={(e) => setPadName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && createOrJoinPad()}
              className="font-mono"
            />
            <Button 
              onClick={createOrJoinPad} 
              disabled={!padName.trim()}
              className="w-full"
            >
              Create or Join Pad
            </Button>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Just type a name and start collaborating!</p>
            <p className="mt-2">
              URL format: <code className="bg-muted px-1 rounded">mosopad.com/padname</code>
            </p>
          </div>
          
          <div className="border-t pt-4 space-y-2">
            <h3 className="font-medium text-sm">Features:</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Real-time collaboration</li>
              <li>• Code syntax highlighting</li>
              <li>• Auto-save changes</li>
              <li>• Subpads for organization</li>
              <li>• Password protection</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
