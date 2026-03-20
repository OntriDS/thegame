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
import { filterRolesToSpecialOnly } from '@/lib/character-roles';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated } from '@/lib/ui/ui-events';
import { useAuth } from '@/lib/hooks/use-auth';
import { CharacterRole } from '@/types/enums';
import { Loader2, User, Mail, Lock, Save, KeyRound } from 'lucide-react';
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
  const { user } = useAuth();
  const isFounder = user?.roles?.includes(CharacterRole.FOUNDER);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Password update fields (only for editing)
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Character selection for linking
  const [characters, setCharacters] = useState<Character[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
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
        const chars = await ClientAPI.getCharacters('special');
        const accounts = await ClientAPI.getAccounts();

        // Get character IDs that already have accounts
        const linkedCharacterIds = new Set(
          accounts
            .filter(acc => acc.characterId && acc.id !== account?.id) // Exclude current account being edited
            .map(acc => acc.characterId)
        );

        // Filter out characters that already have accounts
        let available = chars.filter(char => !linkedCharacterIds.has(char.id));

        // If editing, include the currently linked character
        if (account?.characterId) {
          const currentChar = chars.find(char => char.id === account.characterId);
          if (currentChar && !available.includes(currentChar)) {
            available = [...available, currentChar];
          }
        }

        setCharacters(chars || []);
        setAvailableCharacters(available || []);
      } catch (error) {
        console.error('[Account Modal] Failed to load characters:', error);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    loadCharacters();
  }, [open, account?.id, account?.characterId]);

  // Initialize when opening
  useEffect(() => {
    const loadData = async () => {
      if (open) {
        if (account) {
          // Editing existing account
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
          setEmail('');
          setPhone('');
          setPassword('');
          setSelectedCharacterId('');
        }
      }

      if (!open) {
        didInitRef.current = false;
        // Force clear state when closing to prevent leak to next session
        setEmail('');
        setPhone('');
        setPassword('');
        setSelectedCharacterId('');
        setShowPasswordUpdate(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
      }
    };

    loadData();
  }, [open, account, character]);

  const handlePasswordUpdate = async () => {
    if (isSaving) return;

    // Password update validation
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await ClientAPI.updateAccount(account!.id, { password: newPassword });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordUpdate(false);

      // Show success message (could be improved with toast)
      setError('Password updated successfully');
      setTimeout(() => setError(null), 3000);

      setIsSaving(false);
    } catch (error) {
      console.error('[Account Modal] Failed to update password:', error);
      setError(error instanceof Error ? error.message : 'Failed to update password');
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    // Validation
    if (!email.trim()) {
      setError('Email is required');
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
      // Get character name from selected character
      const selectedChar = characters.find(char => char.id === selectedCharacterId);
      const characterName = selectedChar?.name || account?.name || '';

      const accountData: Account = {
        ...account, // Preserve existing fields for update
        id: account?.id || draftId.current,
        name: characterName.trim(),
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

  const selectedCharacter = characters.find(char => char.id === selectedCharacterId);

  // SearchableSelect groups: only SPECIAL roles (`@/lib/character-roles` + `CHARACTER_ROLE_TYPES.SPECIAL`).
  // API already returns special-eligible characters; this hides regular groups (admin, designer, seller, …).
  const characterOptions = availableCharacters.flatMap((char) => {
    const specialRoles = filterRolesToSpecialOnly(char.roles);
    const roles = specialRoles.length > 0 ? specialRoles : ['eligible'];
    return roles.map((role) => ({
      value: char.id,
      label: char.name,
      group: role,
    }));
  });

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

            {/* Account ID - only visible when editing */}
            {account && (
              <div className="space-y-2">
                <Label htmlFor="account-id">Account ID</Label>
                <Input
                  id="account-id"
                  value={account.id}
                  disabled={true}
                  className="bg-accent/30 opacity-70 font-mono text-xs"
                />
              </div>
            )}

            {/* Character Selection Searchable Select - replaces Name field */}
            <div className="space-y-2">
              <Label htmlFor="character" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Character
              </Label>
              <SearchableSelect
                value={selectedCharacterId}
                onValueChange={setSelectedCharacterId}
                placeholder="Search characters..."
                options={characterOptions}
                disabled={isSaving || isLoadingCharacters || !!account?.characterId}
                className={!!account?.characterId ? 'opacity-70' : ''}
              />
              {selectedCharacter && selectedCharacter.roles && selectedCharacter.roles.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Character Roles: {selectedCharacter.roles.join(', ')}
                </div>
              )}
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

            {/* Password Update Section - only for existing accounts and Founder role */}
            {account && isFounder && (
              <div className="space-y-3 pt-4 border-t border-primary/10">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Change Password
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswordUpdate(!showPasswordUpdate)}
                    className="text-xs"
                  >
                    {showPasswordUpdate ? 'Cancel' : 'Update'}
                  </Button>
                </div>

                {showPasswordUpdate && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      <p className="text-xs text-amber-700 font-medium">
                        Founder-only: You can change this user's password. The user will need to use the new password on next login.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-xs font-medium">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isSaving}
                        autoComplete="new-password"
                        className="bg-accent/30"
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-xs font-medium">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSaving}
                        autoComplete="new-password"
                        className="bg-accent/30"
                        minLength={6}
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handlePasswordUpdate}
                      disabled={isSaving || !newPassword || !confirmPassword}
                      className="w-full bg-primary text-primary-foreground font-semibold"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
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