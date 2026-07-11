'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Star, Plus, X, Award } from 'lucide-react';
import { Character, CharacterAchievement } from '@/types/entities';
import { formatDisplayDate } from '@/lib/utils/date-utils';

interface CharacterProgressionSubmodalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Character;
  onSave: (character: Character) => Promise<void>;
}

export default function CharacterProgressionSubmodal({
  open,
  onOpenChange,
  character,
  onSave,
}: CharacterProgressionSubmodalProps) {
  const [isCreatingAchievement, setIsCreatingAchievement] = useState(false);
  const [achievementName, setAchievementName] = useState('');
  const [achievementDescription, setAchievementDescription] = useState('');

  const achievements = character.achievements || [];

  const handleSaveAchievement = async () => {
    if (!achievementName.trim()) return;

    const newAchievement: CharacterAchievement = {
      id: `achievement-${Date.now()}`,
      name: achievementName.trim(),
      description: achievementDescription.trim() || undefined,
      createdAt: new Date(),
    };

    const updatedCharacter: Character = {
      ...character,
      achievements: [...achievements, newAchievement],
      updatedAt: new Date(),
    };

    await onSave(updatedCharacter);
    setAchievementName('');
    setAchievementDescription('');
    setIsCreatingAchievement(false);
  };

  const handleDeleteAchievement = async (achievementId: string) => {
    const updatedCharacter: Character = {
      ...character,
      achievements: achievements.filter(a => a.id !== achievementId),
      updatedAt: new Date(),
    };
    await onSave(updatedCharacter);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent zIndexLayer="SUB_MODALS" className="w-full max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Award className="h-6 w-6" />
            Character Progression • {character.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)] pr-2 mt-4">
          
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
                  <div className="text-sm text-muted-foreground">Available Mastery Points (MP)</div>
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
                <p className="text-muted-foreground">Allocate Mastery points to improve your character&apos;s cognitive, emotional, and practical abilities!</p>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Achievements
                </CardTitle>
                {!isCreatingAchievement && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingAchievement(true)}
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
              {isCreatingAchievement && (
                <div className="mb-4 p-4 border-2 border-dashed border-primary/30 rounded-lg space-y-3 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">New Achievement</span>
                    <Button variant="ghost" size="sm" onClick={() => setIsCreatingAchievement(false)}>
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
                    <Button variant="outline" size="sm" onClick={() => setIsCreatingAchievement(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      onClick={handleSaveAchievement}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={() => handleDeleteAchievement(achievement.id)}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : !isCreatingAchievement ? (
                <div className="text-center py-6">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground text-sm">No achievements yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first achievement to track your milestones!</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}
