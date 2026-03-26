'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Flag, Award, Target, Star, Crown, Zap, Plus, Shield, X, Trophy } from 'lucide-react';
import { Player, PlayerBadge, PlayerAchievement } from '@/types/entities';
import { CharacterRole, CHARACTER_ROLE_TYPES } from '@/types/enums';
import { formatDisplayDate } from '@/lib/utils/date-utils';

// ============================================================================
// BADGES SECTION - Role-based recognition
// ============================================================================

function BadgesSection({
  playerData,
  onSave,
}: {
  playerData: Player;
  onSave?: (updatedPlayer: Player) => Promise<void>;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [badgeName, setBadgeName] = useState('');
  const [badgeDescription, setBadgeDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<CharacterRole[]>([]);

  const badges = playerData.badges || [];

  const toggleRole = (role: CharacterRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!badgeName.trim() || selectedRoles.length === 0 || !onSave) return;

    const newBadge: PlayerBadge = {
      id: `badge-${Date.now()}`,
      name: badgeName.trim(),
      description: badgeDescription.trim() || undefined,
      requiredRoles: selectedRoles,
      createdAt: new Date(),
    };

    const updatedPlayer: Player = {
      ...playerData,
      badges: [...badges, newBadge],
      updatedAt: new Date(),
    };

    await onSave(updatedPlayer);
    setBadgeName('');
    setBadgeDescription('');
    setSelectedRoles([]);
    setIsCreating(false);
  };

  const handleDelete = async (badgeId: string) => {
    if (!onSave) return;
    const updatedPlayer: Player = {
      ...playerData,
      badges: badges.filter(b => b.id !== badgeId),
      updatedAt: new Date(),
    };
    await onSave(updatedPlayer);
  };

  // All roles grouped by type
  const specialRoles = CHARACTER_ROLE_TYPES.SPECIAL.map(r => r as CharacterRole);
  const regularRoles = CHARACTER_ROLE_TYPES.REGULAR.map(r => r as CharacterRole);

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Badges
          </CardTitle>
          {onSave && !isCreating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Create Badge
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Creation Form */}
        {isCreating && (
          <div className="mb-4 p-4 border-2 border-dashed border-primary/30 rounded-lg space-y-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">New Badge</span>
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Badge name..."
              value={badgeName}
              onChange={(e) => setBadgeName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)..."
              value={badgeDescription}
              onChange={(e) => setBadgeDescription(e.target.value)}
            />
            {/* Role Selection */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Required Roles (pick at least one):</span>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">Special</span>
                  <div className="flex flex-wrap gap-1">
                    {specialRoles.map(role => (
                      <Badge
                        key={role}
                        variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground mb-1 block">Regular</span>
                  <div className="flex flex-wrap gap-1">
                    {regularRoles.map(role => (
                      <Badge
                        key={role}
                        variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!badgeName.trim() || selectedRoles.length === 0}
              >
                <Shield className="h-3 w-3 mr-1" />
                Create Badge
              </Button>
            </div>
          </div>
        )}

        {/* Badge List */}
        {badges.length > 0 ? (
          <div className="space-y-2">
            {badges.map(badge => (
              <div key={badge.id} className="flex items-start justify-between p-3 border rounded-lg group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{badge.name}</div>
                    {badge.description && (
                      <div className="text-sm text-muted-foreground">{badge.description}</div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {badge.requiredRoles.map(role => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {onSave && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={() => handleDelete(badge.id)}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : !isCreating ? (
          <div className="text-center py-6">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm">No badges yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first badge to recognize role-based achievements!</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ACHIEVEMENTS SECTION - User-defined milestones
// ============================================================================

function AchievementsSection({
  playerData,
  onSave,
}: {
  playerData: Player;
  onSave?: (updatedPlayer: Player) => Promise<void>;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [achievementName, setAchievementName] = useState('');
  const [achievementDescription, setAchievementDescription] = useState('');

  const achievements = playerData.achievements || [];

  const handleSave = async () => {
    if (!achievementName.trim() || !onSave) return;

    const newAchievement: PlayerAchievement = {
      id: `achievement-${Date.now()}`,
      name: achievementName.trim(),
      description: achievementDescription.trim() || undefined,
      createdAt: new Date(),
    };

    const updatedPlayer: Player = {
      ...playerData,
      achievements: [...achievements, newAchievement],
      updatedAt: new Date(),
    };

    await onSave(updatedPlayer);
    setAchievementName('');
    setAchievementDescription('');
    setIsCreating(false);
  };

  const handleDelete = async (achievementId: string) => {
    if (!onSave) return;
    const updatedPlayer: Player = {
      ...playerData,
      achievements: achievements.filter(a => a.id !== achievementId),
      updatedAt: new Date(),
    };
    await onSave(updatedPlayer);
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Achievements
          </CardTitle>
          {onSave && !isCreating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Create Achievement
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Creation Form */}
        {isCreating && (
          <div className="mb-4 p-4 border-2 border-dashed border-primary/30 rounded-lg space-y-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">New Achievement</span>
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Achievement name..."
              value={achievementName}
              onChange={(e) => setAchievementName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)..."
              value={achievementDescription}
              onChange={(e) => setAchievementDescription(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!achievementName.trim()}
              >
                <Trophy className="h-3 w-3 mr-1" />
                Create Achievement
              </Button>
            </div>
          </div>
        )}

        {/* Achievement List */}
        {achievements.length > 0 ? (
          <div className="space-y-2">
            {achievements.map(achievement => (
              <div key={achievement.id} className="flex items-start justify-between p-3 border rounded-lg group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{achievement.name}</div>
                    {achievement.description && (
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDisplayDate(achievement.createdAt)}
                    </div>
                  </div>
                </div>
                {onSave && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={() => handleDelete(achievement.id)}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : !isCreating ? (
          <div className="text-center py-6">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm">No achievements yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first achievement to track your milestones!</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PROGRESSION CONTENT
// ============================================================================

// Content-only component for embedding in parent modals
export function PlayerProgressionContent({
  playerData,
  onSave,
}: {
  playerData: Player;
  onSave?: (updatedPlayer: Player) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      {/* RPG Stats Preview */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            RPG Stats Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-primary">Level 0</div>
            <div className="text-sm text-muted-foreground">Experience: 0 / 1000 XP</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
          <div className="text-xs p-3 border rounded-lg bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center">
                <Zap className="h-3 w-3 text-primary" />
              </div>
              <span className="font-semibold">RPG System Coming in V0.2</span>
            </div>
            <p className="text-muted-foreground">Experience-based progression, level unlocks, skill points, and more!</p>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <BadgesSection playerData={playerData} onSave={onSave} />

      {/* Skill Points Preview */}
      <Card className="border-2 border-yellow-200 dark:border-yellow-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            Skill Points Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <div className="text-sm text-muted-foreground">Available Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">Spent Points</div>
            </div>
          </div>
          <div className="mt-4 text-xs p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-yellow-200 rounded flex items-center justify-center">
                <Star className="h-3 w-3 text-yellow-600" />
              </div>
              <span className="font-semibold">Skill System Coming in V0.2</span>
            </div>
            <p className="text-muted-foreground">Allocate skill points to improve your character&apos;s abilities!</p>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <AchievementsSection playerData={playerData} onSave={onSave} />
    </div>
  );
}

// ============================================================================
// STANDALONE DIALOG (kept for backward compatibility)
// ============================================================================

interface PlayerProgressionTabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerData: any;
}

export default function PlayerProgressionTab({
  open,
  onOpenChange,
  playerData
}: PlayerProgressionTabProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer={'INNER_FIELDS'} className="w-full max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Flag className="h-6 w-6" />
            Player Progression • {playerData?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
          <PlayerProgressionContent playerData={playerData} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
