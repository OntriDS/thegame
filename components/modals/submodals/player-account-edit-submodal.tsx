'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { getZIndexClass, getZIndexValue } from '@/lib/utils/z-index-utils';

interface AccountEditModalProps {
  account: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: any) => void;
}

export default function AccountEditModal({ account, open, onOpenChange, onSave }: AccountEditModalProps) {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [phone, setPhone] = useState(account.phone || '');
  
  useEffect(() => {
    setName(account.name);
    setEmail(account.email);
    setPhone(account.phone || '');
  }, [account, open]);
  
  const handleSave = () => {
    const updatedAccount = {
      ...account,
      name,
      email,
      phone: phone || undefined,
      updatedAt: new Date()
    };
    onSave(updatedAccount);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Account • {account.name || 'Unnamed'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-xs p-2 border rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
            <p className="font-semibold">⚠️ The Triforce - Source of Truth</p>
            <p className="text-muted-foreground mt-1">Changes here update Account, Player, and Character names.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="account-name">Name *</Label>
            <Input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <div className="text-xs text-muted-foreground">
              This name will be synced to Player and Character
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="account-email">Email *</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="account-phone">Phone</Label>
            <Input
              id="account-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+506 1234-5678"
            />
          </div>
          
          <div className="text-xs p-2 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <p className="font-semibold">Account ID</p>
            <p className="text-muted-foreground mt-1 font-mono text-xs">{account.id}</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || !email}>
            Save Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
