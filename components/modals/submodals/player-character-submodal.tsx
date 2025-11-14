'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { Character } from '@/types/entities';

interface PlayerCharacterModalProps {
  character: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PlayerCharacterModal({ character, open, onOpenChange }: PlayerCharacterModalProps) {
  if (!character) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Player Character</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            No player character found.
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Player Character • {character.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-xs p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <p className="font-semibold">⚡ The Triforce Connection</p>
            <p className="text-muted-foreground mt-1">This character is mega-linked to your Player and Account with super glue.</p>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="mt-1 text-base font-medium">{character.name}</div>
            </div>
            
            {character.description && (
              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <div className="mt-1 text-sm">{character.description}</div>
              </div>
            )}
            
            <div>
              <div className="text-xs text-muted-foreground">Roles</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {character.roles.map(role => (
                  <span key={role} className="text-xs px-2 py-1 rounded-md border">
                    {role}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div>
                <div className="text-xs text-muted-foreground">Purchased Amount</div>
                <div className="mt-1 text-lg font-bold">
                  ${character.purchasedAmount.toFixed(2)}
                </div>
              </div>
            </div>
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
