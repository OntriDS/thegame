'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, Award, Target, Star, Crown, Zap } from 'lucide-react';
import { getZIndexClass } from '@/lib/utils/z-index-utils';

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
      <DialogContent className={`w-full max-w-7xl max-h-[90vh] ${getZIndexClass('MODAL_TABS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Flag className="h-6 w-6" />
            Player Progression • {playerData?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
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

          {/* Current Achievements */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Current Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">No achievements unlocked yet</p>
                <p className="text-xs text-muted-foreground mt-2">Complete tasks and reach milestones to unlock achievements!</p>
              </div>
            </CardContent>
          </Card>

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
                <p className="text-muted-foreground">Allocate skill points to improve your character's abilities!</p>
              </div>
            </CardContent>
          </Card>

          {/* Goals & Milestones */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Goals & Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">First Task Completed</div>
                      <div className="text-sm text-muted-foreground">Complete your first task</div>
                    </div>
                  </div>
                  <Badge variant="outline">Not Started</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">First Sale</div>
                      <div className="text-sm text-muted-foreground">Make your first sale</div>
                    </div>
                  </div>
                  <Badge variant="outline">Not Started</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">Level 5</div>
                      <div className="text-sm text-muted-foreground">Reach level 5</div>
                    </div>
                  </div>
                  <Badge variant="outline">Not Started</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
