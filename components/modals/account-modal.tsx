'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { v4 as uuid } from 'uuid';
import type { Account, Character } from '@/types/entities';
import { iamService, CharacterRole } from '@/lib/iam-service';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated } from '@/lib/ui/ui-events';
import { Loader2, User, Mail, Lock, Save } from 'lucide-react';
import DeleteModal from './submodals/delete-submodal';
import { EntityType } from '@/types/enums';

interface AccountModalProps {
  account?: Account | null;
  character?: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: Account) => Promise<void>;
}

/**
 * AccountModal
 * Simple account creation modal for linking accounts to characters
 */
export default function AccountModal({ account, character, open, onOpenChange, onSave }: AccountModalProps) {
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Character selection for linking
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Guard for one-time initialization of new accounts
  const didInitRef = useRef(false);

  // ID persistence for edits
  const draftId = useRef(account?.id || uuid());

  // Load characters when modal opens
  useEffect(() => {
    const loadCharacters = async () => {
      if (!open) return;
      setIsLoadingCharacters(true);
      try {
        const chars = await ClientAPI.getCharacters();
        setCharacters(chars || []);
      } catch (error) {
        console.error('[Account Modal] Failed to load characters:', error);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    loadCharacters();
  }, [open]);

  // Initialize when opening
  useEffect(() => {
    const loadData = async () => {
      if (open) {
        if (account) {
          // Editing existing account
          setName(account.name || '');
          setEmail(account.email || '');
          setPhone(account.phone || '');
          setPassword(''); // Don't show existing password

          // Set selected character
          if (account.characterId) {
            setSelectedCharacterId(account.characterId);
          }

          // Reset init guard when editing
          didInitRef.current = false;
        } else if (!didInitRef.current) {
          // Creating new account - initialize once only
          didInitRef.current = true;
          // Generate new ID for new session
          draftId.current = uuid();
          setName('');
          setEmail('');
          setPhone('');
          setPassword('');
          setSelectedCharacterId('');
        }
      }

      if (!open) {
        didInitRef.current = false;
        // Force clear state when closing to prevent leak to next session
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setSelectedCharacterId('');
        setError(null);
      }
    };

    loadData();
  }, [open, account, character]);

  const handleSave = async () => {
    if (isSaving) return;

    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    // For new accounts, password is required
    if (!account && !password.trim()) {
      setError('Password is required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation (required for new accounts)
    if (!account && !password.trim()) {
      setError('Password is required');
      return;
    }

    // Password length validation
    if (password.trim() && password.trim().length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Character validation (Mandatory)
    if (!selectedCharacterId) {
      setError('A character must be linked to this account');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const accountData: Account = {
        ...account, // Preserve existing fields for update
        id: account?.id || draftId.current,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password.trim(), // Password will be hashed by API
        isActive: account?.isActive ?? true,
        isVerified: account?.isVerified ?? false,
        characterId: selectedCharacterId || undefined,
        loginAttempts: account?.loginAttempts || 0,
        createdAt: account?.createdAt || new Date(),
        updatedAt: new Date(),
        links: account?.links || [],
      } as any; // Cast to any to include password for API

      await ClientAPI.upsertAccount(accountData);

      // Dispatch update event
      dispatchEntityUpdated('account');

      // Call parent onSave if provided
      if (onSave) {
        await onSave(accountData);
      }

      // Clear form for next create
      if (!account) {
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setSelectedCharacterId('');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('[Account Modal] Failed to save account:', error);
      setError(error instanceof Error ? error.message : 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;

    try {
      await ClientAPI.deleteAccount(account.id);
      
      // Dispatch update event
      dispatchEntityUpdated('account');
      
      setShowDeleteModal(false);
      onOpenChange(false);
    } catch (error) {
      console.error('[Account Modal] Failed to delete account:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account');
    }
  };

  // Auto-populate name when character is selected
  useEffect(() => {
    if (selectedCharacterId && !account) {
      const char = characters.find(c => c.id === selectedCharacterId);
      if (char) {
        setName(char.name);
      }
    }
  }, [selectedCharacterId, characters, account]);

  const selectedCharacter = characters.find(char => char.id === selectedCharacterId);

  // Create character options for SearchableSelect
  const characterOptions = characters.map((char) => ({
    value: char.id,
    label: char.name,
    group: char.roles && char.roles.length > 0 ? char.roles.join(', ') : 'No roles',
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent zIndexLayer={'MODALS'} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {account ? 'Edit Account' : 'Create Account'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {account ? 'Update account information' : 'Create a new account and link it to a character.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            {/* Name Field - Read-only, derived from linked character */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Select a character to auto-fill name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={true}
                autoComplete="off"
                className="bg-accent/30 opacity-70"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="account@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSaving || isLoadingCharacters}
                autoComplete="new-password" 
                className="bg-accent/30"
              />
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSaving || isLoadingCharacters}
                autoComplete="off"
                className="bg-accent/30"
              />
            </div>

            {/* Password Field - only for new accounts */}
            {!account && (
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSaving || isLoadingCharacters}
                  autoComplete="new-password"
                  className="bg-accent/30"
                  minLength={6}
                />
              </div>
            )}

            {/* Character Selection Searchable Select */}
            <div className="space-y-2">
              <Label htmlFor="character" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Link to Character
              </Label>
              <SearchableSelect
                value={selectedCharacterId}
                onValueChange={setSelectedCharacterId}
                placeholder="Search characters..."
                options={characterOptions}
                disabled={isSaving || isLoadingCharacters || !!account?.characterId}
                className={!!account?.characterId ? 'opacity-70' : ''}
              />
              {selectedCharacter && selectedCharacter && (
                <div className="text-xs text-muted-foreground mt-1">
                  Linking to: <span className="font-medium">{selectedCharacter.name}</span>
                  {selectedCharacter.roles && selectedCharacter.roles.length > 0 && (
                    <span className="ml-2">Roles: {selectedCharacter.roles.join(', ')}</span>
                  )}
                </div>
              )}
              {!!account?.characterId && (
                <p className="text-[10px] text-muted-foreground italic mt-1">
                  * Account identity is permanent and cannot be re-linked to another character.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {account && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isSaving}
                  className="text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || isLoadingCharacters}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {account ? 'Update Account' : 'Create Account'}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {account && (
        <DeleteModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          entityType={EntityType.ACCOUNT}
          entities={account ? [account] : []}
          onComplete={handleDelete}
        />
      )}
    </>
  );
}