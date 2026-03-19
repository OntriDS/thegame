'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JungleCoinWallet } from '@/components/wallet/jungle-coin-wallet';
import { Wallet } from 'lucide-react';

interface CharacterWalletSubmodalProps {
  characterId: string;
  characterName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CharacterWalletSubmodal({
  characterId,
  characterName,
  open,
  onOpenChange
}: CharacterWalletSubmodalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer="SUB_MODALS" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Jungle Coin Wallet • {characterName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <JungleCoinWallet 
            characterId={characterId} 
            className="w-full border-0 shadow-none p-0" 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
