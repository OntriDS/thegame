'use client';

import React, { useEffect, useState, useRef } from 'react';
import { v4 as uuid } from 'uuid';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import NumericInput from '@/components/ui/numeric-input';

import type { Character } from '@/types/entities';
import { CharacterRole, CHARACTER_ROLE_TYPES, EntityType, PLAYER_ONE_ID } from '@/types/enums';
import { ROLE_COLORS } from '@/lib/constants/color-constants';
import { useTheme } from '@/lib/hooks/use-theme';
import { ROLE_BEHAVIORS, canViewAccountInfo } from '@/lib/game-mechanics/roles-rules';
import { Network, Info, Trash2, Package } from 'lucide-react';
import { ClientAPI } from '@/lib/client-api';
import { dispatchEntityUpdated, entityTypeToKind } from '@/lib/ui/ui-events';
import DeleteModal from './submodals/delete-submodal';
import LinksRelationshipsModal from './submodals/links-relationships-submodal';
import CharacterInventorySubmodal from './submodals/character-inventory-submodal';
// Side effects handled by parent component via API calls
import { getZIndexClass } from '@/lib/utils/z-index-utils';

interface CharacterModalProps {
  character?: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (character: Character) => Promise<void>;
}

/**
 * CharacterModal
 * Character management (Roles, Contact Info, CP, Achievements)
 */
export default function CharacterModal({ character, open, onOpenChange, onSave }: CharacterModalProps) {
  // Identity
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Roles
  const [roles, setRoles] = useState<CharacterRole[]>([]);
  const [specialRoles, setSpecialRoles] = useState<CharacterRole[]>([]);
  
  // Account Info Modal
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  // Loading state
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Guard for one-time initialization of new characters
  const didInitRef = useRef(false);

  // V0.1 Core - Game Mechanics (Character-specific only!)
  const [purchasedAmount, setPurchasedAmount] = useState<number>(0);
  const [CP, setCP] = useState<number | undefined>(undefined);
  const [achievementsCharacter, setAchievementsCharacter] = useState<string[]>([]);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // Initialize when opening
  useEffect(() => {
    const loadData = async () => {
      if (open) {
        if (character) {
          // Editing existing character
          // If character has PLAYER role and Account linked, load from Account
          if (character.roles?.includes(CharacterRole.PLAYER) && character.accountId) {
            try {
              const account = await ClientAPI.getAccount(character.accountId);
              if (account) {
                setName(account.name || '');
                setContactEmail(account.email || '');
                setContactPhone(account.phone || '');
              }
            } catch (error) {
              console.error('Failed to load account data:', error);
              // Fallback to character data
              setName(character?.name || '');
              setContactPhone(character?.contactPhone || '');
              setContactEmail(character?.contactEmail || '');
            }
          } else {
            setName(character?.name || '');
            setContactPhone(character?.contactPhone || '');
            setContactEmail(character?.contactEmail || '');
          }
          
          setDescription(character?.description || '');
          setRoles(character?.roles || []);
          setPurchasedAmount(character?.purchasedAmount ?? 0);
          setCP(character?.CP);
          setAchievementsCharacter(character?.achievementsCharacter || []);
          
          // Reset init guard when editing
          didInitRef.current = false;
        } else if (!didInitRef.current) {
          // Creating new character - initialize once only (don't reset again while user edits)
          didInitRef.current = true;
          setName('');
          setDescription('');
          setContactPhone('');
          setContactEmail('');
          setRoles([CharacterRole.CUSTOMER]); // Default to CUSTOMER role for new characters
          setPurchasedAmount(0);
          setCP(undefined);
          setAchievementsCharacter([]);
        }
      }
      
      // Reset init guard when modal closes (allows fresh init on next open)
      if (!open) {
        didInitRef.current = false;
      }
    };
    
    loadData();
  }, [open, character]); // open needed for async loading, character for data changes

  const toggleRole = (role: CharacterRole, checked: boolean) => {
    if (checked) setRoles(prev => (prev.includes(role) ? prev : [...prev, role]));
    else setRoles(prev => prev.filter(r => r !== role));
  };

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCustomerPurchase, setShowCustomerPurchase] = useState(false);

  // Check if CUSTOMER role is selected
  const isCustomer = roles.includes(CharacterRole.CUSTOMER);

  // Regular roles (user-toggleable) from CHARACTER_ROLE_TYPES
  const regularRoles = CHARACTER_ROLE_TYPES.REGULAR.map(r => r as CharacterRole);
  
  // Special roles (badges, system-controlled)
  const specialRolesList = CHARACTER_ROLE_TYPES.SPECIAL.map(r => r as CharacterRole);
  
  // Check if editing Player One (Founder)
  const isPlayerOne = character?.id === PLAYER_ONE_ID || character?.playerId === PLAYER_ONE_ID;
  
  // For new characters, also show SpecialFields (they should be able to assign special roles)
  const shouldShowSpecialFields = isPlayerOne || !character;
  
  // Check if character has PLAYER role (personal data should be read-only from Account)
  const hasPlayerRole = character?.roles?.includes(CharacterRole.PLAYER) || false;

  // Get theme for dark mode detection
  const { isDark } = useTheme();

  // Get role color based on role type and dark mode
  const getRoleColor = (role: CharacterRole, isActive: boolean): string => {
    if (!isActive) return ''; // No special styling for inactive roles
    
    // Convert role to uppercase to match ROLE_COLORS keys
    const roleKey = role.toUpperCase() as keyof typeof ROLE_COLORS;
    const colorClass = ROLE_COLORS[roleKey] || ROLE_COLORS.CUSTOMER;
    
    // Return appropriate color based on dark mode
    return colorClass;
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    // Validation: Characters must have at least one role
    if (roles.length === 0) {
      alert('Please select at least one role for the character.');
      setIsSaving(false);
      return;
    }
    
    try {
      // If character has PLAYER role, don't save name/email/phone (they're from Account)
      const shouldPreserveContactInfo = hasPlayerRole;
      
      const newCharacter: Character = {
        id: character?.id || uuid(),
        name: name?.trim() || 'Unnamed Character',
        description: description?.trim() || undefined,
        createdAt: character?.createdAt || new Date(),
        updatedAt: new Date(),
        isActive: character?.isActive ?? true,  // Character is active by default
        links: character?.links || [],

        // Account Ambassador - Preserve existing accountId
        accountId: character?.accountId || null,

        // Character core
        roles,
        // For PLAYER role characters, preserve existing contact info (read from Account)
        contactPhone: shouldPreserveContactInfo ? character?.contactPhone : (contactPhone?.trim() || undefined),
        contactEmail: shouldPreserveContactInfo ? character?.contactEmail : (contactEmail?.trim() || undefined),

        // Character Stats
        commColor: character?.commColor,

        // Character Progression
        CP,
        achievementsCharacter,

        // V0.1 required - Character-specific only
        purchasedAmount,
        inventory: character?.inventory || [], // Empty array for new characters

        // Relationships - V0.1: Founder player is the default
        playerId: character?.playerId || PLAYER_ONE_ID,

        // Lifecycle
        lastActiveAt: character?.lastActiveAt || new Date(),

        // Social graph
        relationships: character?.relationships,
      };

      await onSave(newCharacter);
      
      // Dispatch events AFTER successful save
      dispatchEntityUpdated(entityTypeToKind(EntityType.CHARACTER));
      
      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      // Keep modal open on error
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = () => {
    if (!character) return;
    setShowDeleteModal(true);
  };
  
  const handleDeleteComplete = () => {
    setShowDeleteModal(false);
    // Dispatch UI update event after successful deletion
    dispatchEntityUpdated(entityTypeToKind(EntityType.CHARACTER));
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{character ? 'Edit Character' : 'Create Character'}</DialogTitle>
            <DialogDescription>
              {character ? 'Modify the character details below' : 'Fill in the character information to create a new character'}
            </DialogDescription>
          </DialogHeader>

        {/* Content - 2 Column Layout */}
        <div className="px-6 space-y-4">
          {/* Column Headers */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            {/* <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🧬 Native</div>*/}
            {/* <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🧬 Native</div>*/}
          </div>

          {/* Main 2-Column Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Column 1: NATIVE (Contact Info) */}
            <div className="space-y-3">
              {/* Personal Data - Read-only for PLAYER role */}
              {hasPlayerRole && (
                <div className="text-xs p-2 border rounded bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200">
                  Personal data managed by Account. Edit from <strong>Player Modal → Edit Account</strong>.
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="char-name" className="text-xs">
                  Name * {hasPlayerRole && <span className="text-muted-foreground">(from Account)</span>}
                </Label>
                <Input
                  id="char-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Character name"
                  className="h-8 text-sm"
                  readOnly={hasPlayerRole}
                  disabled={hasPlayerRole}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="char-phone" className="text-xs">
                  Phone {hasPlayerRole && <span className="text-muted-foreground">(from Account)</span>}
                </Label>
                <Input
                  id="char-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  className="h-8 text-sm"
                  readOnly={hasPlayerRole}
                  disabled={hasPlayerRole}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="char-email" className="text-xs">
                  Email {hasPlayerRole && <span className="text-muted-foreground">(from Account)</span>}
                </Label>
                <Input
                  id="char-email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="h-8 text-sm"
                  readOnly={hasPlayerRole}
                  disabled={hasPlayerRole}
                />
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-8 text-xs w-full"
                >
                  Advanced
                </Button>
              </div>
            </div>

            {/* Column 2: NATIVE (Roles as Buttons) */}
            <div className="space-y-3">
              <Label className="text-xs">Roles *</Label>
              
              {/* Regular Roles - User can toggle freely */}
              <div className="space-y-1">
                <div className="grid grid-cols-5 gap-1">
                  {regularRoles.map(role => {
                    const isActive = roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role, !isActive)}
                        className={`h-7 text-xs px-2 rounded-md border transition-colors ${
                          isActive 
                            ? getRoleColor(role, true)
                            : 'border-input bg-background hover:bg-muted hover:text-accent-foreground'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Roles - System-controlled */}
              {shouldShowSpecialFields && (
                <div className="space-y-1 border-t pt-2 mt-2">
                  <Label className="text-xs">Special Roles</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {specialRolesList.map(role => {
                      const hasRole = roles.includes(role);
                      const behavior = ROLE_BEHAVIORS[role as keyof typeof ROLE_BEHAVIORS];
                      
                      // Skip if no behavior defined (shouldn't happen with proper enums)
                      if (!behavior) return null;
                      
                      // Hide if not assigned and role config says to hide
                      if (behavior.hideIfNotAssigned && !hasRole) return null;
                      
                      // Determine if role is display-only (not toggleable)
                      const isDisplayOnly = behavior.isDisplayOnly;
                      
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => !isDisplayOnly && toggleRole(role, !hasRole)}
                          className={`h-7 text-xs px-2 rounded-md border transition-colors ${
                            hasRole 
                              ? getRoleColor(role, true) + (isDisplayOnly ? ' cursor-not-allowed' : '')
                              : 'border-input bg-background hover:bg-muted hover:text-accent-foreground'
                          }`}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Purchase Section (Conditional) */}
          {isCustomer && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Customer Purchase Data</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCustomerPurchase(!showCustomerPurchase)}
                  className="h-7 text-xs"
                >
                  {showCustomerPurchase ? 'Hide' : 'Show'} Purchase Data
                </Button>
              </div>
              
              {showCustomerPurchase && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchased-amount" className="text-xs">Purchased Amount ($)</Label>
                    <NumericInput
                      id="purchased-amount"
                      value={purchasedAmount}
                      onChange={setPurchasedAmount}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Account Info Button - Only for FOUNDER/ADMIN roles */}
            {character && canViewAccountInfo(roles) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAccountInfo(true)}
                className="h-8 text-xs"
                title="View Account Information"
              >
                <Info className="h-4 w-4" />
              </Button>
            )}

            {/* Links Button - Only when editing existing character */}
            {character && (
              <Button
                variant="outline"
                onClick={() => setShowRelationshipsModal(true)}
                className="h-8 text-xs"
              >
                <Network className="w-3 h-3 mr-1" />
                Links
              </Button>
            )}

            {/* Inventory Button - Only when editing existing character */}
            {character && (
              <Button
                variant="outline"
                onClick={() => setShowInventoryModal(true)}
                className="h-8 text-xs"
              >
                <Package className="w-3 h-3 mr-1" />
                Inventory
              </Button>
            )}

            {/* Delete Button - Only when editing existing character */}
            {character && (
              <Button
                variant="outline"
                onClick={handleDelete}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Delete
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} className="h-8 text-xs" disabled={!name.trim() || isSaving}>
              {isSaving ? 'Saving...' : (character ? 'Update' : 'Create')} Character
            </Button>
          </div>
        </DialogFooter>

        {/* Advanced Section (Description) */}
        {showAdvanced && (
          <div className="px-6 pb-4">
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="char-description" className="text-xs">Description</Label>
              <Textarea
                id="char-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Character description..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>

    {/* Account Info Submodal */}
    {character && (
      <AccountInfoModal
        character={character}
        open={showAccountInfo}
        onOpenChange={setShowAccountInfo}
      />
    )}
    
    {/* Delete Confirmation Modal */}
    {character && (
      <DeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        entityType={EntityType.CHARACTER}
        entities={[character]}
        onComplete={handleDeleteComplete}
      />
    )}

    {/* Links Relationships Modal */}
    {character && (
      <LinksRelationshipsModal
        entity={{ type: EntityType.CHARACTER, id: character.id, name: character.name }}
        open={showRelationshipsModal}
        onClose={() => setShowRelationshipsModal(false)}
      />
    )}

    {/* Character Inventory Submodal */}
    {character && (
      <CharacterInventorySubmodal
        open={showInventoryModal}
        onOpenChange={setShowInventoryModal}
        characterId={character.id}
        characterName={character.name}
      />
    )}
    </>
  );
}

// Account Info Submodal - Shows Account entity data (read-only)
interface AccountInfoModalProps {
  character: Character;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AccountInfoModal({ character, open, onOpenChange }: AccountInfoModalProps) {
  const [account, setAccount] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const loadAccount = async () => {
      if (open && character.accountId) {
        setIsLoading(true);
        try {
          const accountData = await ClientAPI.getAccount(character.accountId);
          setAccount(accountData);
        } catch (error) {
          console.error('Failed to load account:', error);
          setAccount(null);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadAccount();
  }, [character, open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'SUB_MODALS'} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Account Information • {character.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading account data...</div>
          ) : !character.accountId ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No Account entity linked to this character yet.</p>
              <p className="text-xs mt-2">Account will be created when email/phone is added.</p>
            </div>
          ) : !account ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>Account entity not found.</p>
              <p className="text-xs mt-2">Account ID: {character.accountId}</p>
            </div>
          ) : (
            <>
              <div className="text-xs p-2 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="font-semibold">Account Entity (Read-Only)</p>
                <p className="text-muted-foreground mt-1">ID: {account.id}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={account.name || ''}
                  readOnly
                  disabled
                  className="bg-muted/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={account.email || ''}
                  readOnly
                  disabled
                  className="bg-muted/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={account.phone || ''}
                  readOnly
                  disabled
                  className="bg-muted/50"
                  placeholder="No phone"
                />
              </div>
              
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account Status:</span>
                  <span className={account.isActive ? 'text-green-600' : 'text-red-600'}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {account.lastActiveAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Active:</span>
                    <span className="text-xs">{new Date(account.lastActiveAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


