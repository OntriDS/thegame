'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Network } from 'lucide-react';
import { Player } from '@/types/entities';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface RelationshipsModalProps {
  player: Player;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RelationshipsModal({ player, open, onOpenChange }: RelationshipsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${getZIndexClass('CRITICAL')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Player Relationships
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-xs p-4 border rounded-lg bg-primary/5">
            <p className="font-semibold mb-2">🔗 Coming in V0.2: Relationship Graph</p>
            <p className="mb-2">This feature will display:</p>
            <ul className="space-y-1 ml-4">
              <li>• Character relationships and connections</li>
              <li>• Social network visualization</li>
              <li>• Team collaboration networks</li>
              <li>• Influence and impact mapping</li>
            </ul>
          </div>
          
          <div className="text-center py-6">
            <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">Relationship system not yet implemented</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
