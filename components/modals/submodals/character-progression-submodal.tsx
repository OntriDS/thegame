'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Star, Plus, X, Award, ChevronDown } from 'lucide-react';
import { Character, CharacterQualification } from '@/types/entities';
import { formatForDisplay } from '@/lib/utils/date-display-utils';;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PREDEFINED_QUALIFICATIONS } from '@/lib/constants/qualifications';

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
  const [isCreatingQualification, setIsCreatingQualification] = useState(false);
  const [qualificationName, setQualificationName] = useState('');
  const [qualificationDescription, setQualificationDescription] = useState('');

  const qualifications = character.qualifications || [];

  const handleSaveQualification = async () => {
    if (!qualificationName.trim()) return;

    const newQualification: CharacterQualification = {
      id: `qualification-${Date.now()}`,
      name: qualificationName.trim(),
      description: qualificationDescription.trim() || undefined,
      createdAt: new Date(),
    };

    const updatedCharacter: Character = {
      ...character,
      qualifications: [...qualifications, newQualification],
      updatedAt: new Date(),
    };

    await onSave(updatedCharacter);
    setQualificationName('');
    setQualificationDescription('');
    setIsCreatingQualification(false);
  };

  const handleDeleteQualification = async (qualificationId: string) => {
    const updatedCharacter: Character = {
      ...character,
      qualifications: qualifications.filter(a => a.id !== qualificationId),
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
                <p className="text-muted-foreground">Allocate Mastery points to improve your character&apos;s cognitive, emotional, and technical abilities!</p>
              </div>
            </CardContent>
          </Card>

          {/* Qualifications */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Qualifications
                </CardTitle>
                {!isCreatingQualification && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingQualification(true)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Create Qualification
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Creation Form */}
              {isCreatingQualification && (
                <div className="mb-4 p-4 border-2 border-dashed border-primary/30 rounded-lg space-y-3 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">New Qualification</span>
                    <Button variant="ghost" size="sm" onClick={() => setIsCreatingQualification(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Select 
                      value={PREDEFINED_QUALIFICATIONS.includes(qualificationName) ? qualificationName : (qualificationName ? 'custom' : '')}
                      onValueChange={(val) => setQualificationName(val === 'custom' ? '' : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select qualification..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_QUALIFICATIONS.map(qualification => (
                          <SelectItem key={qualification} value={qualification}>{qualification}</SelectItem>
                        ))}
                        <SelectItem value="custom" className="font-bold text-primary">-- Custom Qualification --</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {(!PREDEFINED_QUALIFICATIONS.includes(qualificationName) && qualificationName !== '' || !PREDEFINED_QUALIFICATIONS.includes(qualificationName) && qualificationName === '') && (
                      <Input
                        placeholder="Type custom qualification name..."
                        value={qualificationName}
                        onChange={(e) => setQualificationName(e.target.value)}
                      />
                    )}
                  </div>
                  <Input
                    placeholder="Description (optional)..."
                    value={qualificationDescription}
                    onChange={(e) => setQualificationDescription(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setIsCreatingQualification(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      onClick={handleSaveQualification}
                      disabled={!qualificationName.trim()}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      Create Qualification
                    </Button>
                  </div>
                </div>
              )}

              {/* Qualification List */}
              {qualifications.length > 0 ? (
                <div className="space-y-2">
                  {qualifications.map(qualification => (
                    <div key={qualification.id} className="flex items-start justify-between p-3 border rounded-lg group">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Trophy className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{qualification.name}</div>
                          {qualification.description && (
                            <div className="text-sm text-muted-foreground">{qualification.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatForDisplay(qualification.createdAt)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={() => handleDeleteQualification(qualification.id)}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : !isCreatingQualification ? (
                <div className="text-center py-6">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground text-sm">No qualifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first qualification to track your progression!</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}
