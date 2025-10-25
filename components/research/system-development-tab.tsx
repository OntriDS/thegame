'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Zap } from 'lucide-react';
import { formatDisplayDate } from '@/lib/utils/date-utils';

interface SystemDevelopmentTabProps {
  projectStatus: any;
}

export function SystemDevelopmentTab({ projectStatus }: SystemDevelopmentTabProps) {
  if (!projectStatus) {
    return (
      <TabsContent value="system-development" className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Loading project status...</p>
            </div>
          </CardContent>    
        </Card>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="system-development" className="space-y-6">
      {/* Project State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Project State
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Basic Project Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Current Sprint</h4>
                  <p className="text-sm text-muted-foreground">{projectStatus.currentSprint}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Last Updated</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDisplayDate(new Date(projectStatus.lastUpdated))}
                  </p>
                </div>
              </div>
            </div>

            {/* Systems Status */}
            {projectStatus.systems && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Systems Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(projectStatus.systems).map(([systemKey, system]: [string, any]) => (
                    <div key={systemKey} className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          system.status?.toLowerCase() === 'done' ? 'bg-green-500' : 
                          system.status?.toLowerCase() === 'in progress' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-medium capitalize">{systemKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground ml-5">
                        {system.version} - {system.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>  


          {/* Next Challenges */}
          {projectStatus.nextChallenges && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg border-b pb-2 mt-4">Next Challenges</h4>
              {Object.entries(projectStatus.nextChallenges).map(([sectionKey, section]: [string, any]) => (
                <div key={sectionKey} className="space-y-4">
                  <h5 className="font-semibold text-lg capitalize">{sectionKey.replace(/([A-Z])/g, ' $1').trim()}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(section).map(([reqKey, requirement]: [string, any]) => (
                      <div key={reqKey} className="space-y-2 p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <h6 className="font-medium capitalize">{reqKey.replace(/([A-Z])/g, ' $1').trim()}</h6>
                          {requirement.priority && (
                            <Badge 
                              variant={requirement.priority === 'high' ? 'default' : requirement.priority === 'critical' ? 'destructive' : 'outline'}
                            >
                              {requirement.priority}
                            </Badge>
                          )}
                        </div>
                        {requirement.description && (
                          <p className="text-sm text-muted-foreground">{requirement.description}</p>
                        )}
                        {requirement.features && Array.isArray(requirement.features) && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Features:</span>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {requirement.features.map((feature: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
