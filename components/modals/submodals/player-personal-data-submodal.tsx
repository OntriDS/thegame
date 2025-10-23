'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import { Player } from '@/types/entities';
import { ClientAPI } from '@/lib/client-api';
import { getZIndexClass, getZIndexValue } from '@/lib/utils/z-index-utils';

interface PersonalDataModalProps {
  player: Player;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (player: Player) => void;
}

export default function PersonalDataModal({ player, open, onOpenChange, onSave }: PersonalDataModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);
  const [accountData, setAccountData] = useState<any | null>(null);
  
  useEffect(() => {
    const loadPersonalData = async () => {
      if (open) {
        setIsLoadingAccount(true);
        
        if (player.accountId) {
          try {
            const account = await ClientAPI.getAccount(player.accountId);
            if (account) {
              setAccountData(account);
              setName(account.name);
              setEmail(account.email);
              setPhone(account.phone || '');
              setIsLoadingAccount(false);
              return;
            }
          } catch (error) {
            console.error('Failed to load account:', error);
          }
        }
        
        setAccountData(null);
        setName(player.name);
        setEmail(player.email);
        setPhone('');
        setIsLoadingAccount(false);
      }
    };
    
    loadPersonalData();
  }, [player, open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Data
            {accountData && (
              <span className="ml-auto text-xs font-normal text-green-600 dark:text-green-400">
                • Account Linked
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isLoadingAccount ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <div className="mt-1 text-base font-medium">{name || '—'}</div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="mt-1 text-sm">{email || '—'}</div>
                </div>
                
                {phone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <div className="mt-1 text-sm">{phone}</div>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                {player.isActive ? (
                  <span className="text-green-600 dark:text-green-400">● Active</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">● Inactive</span>
                )}
              </div>
              
              {player.lastActiveAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Active</span>
                  <span className="text-xs">
                    {new Date(player.lastActiveAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </>
          )}
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
