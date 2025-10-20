'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Link, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react';
import { ENTITY_RULES } from '@/lib/game-mechanics/entity-rules';
import { LinkType, EntityType } from '@/types/enums';

interface UserVisibleRule {
  id: string;
  name: string;
  description: string;
  sourceEntity: EntityType;
  targetEntity: EntityType;
  trigger: string;
  action: string;
  userEditable: boolean;
  ruleType: 'link' | 'directional';
}

export function LinkRulesTab() {
  // Convert ENTITY_RULES to user-friendly format
  const linkRules: UserVisibleRule[] = ENTITY_RULES.LINK_RULES.map((rule, index) => ({
    id: `link-${index}`,
    name: `${rule.linkType} Relationship Rule`,
    description: `${rule.onSourceDelete} on source delete, ${rule.onTargetDelete} on target delete`,
    sourceEntity: rule.linkType.split('_')[0].toLowerCase() as EntityType,
    targetEntity: rule.linkType.split('_')[1].toLowerCase() as EntityType,
    trigger: 'Entity deletion/update',
    action: `${rule.onSourceDelete}/${rule.onTargetDelete}`,
    userEditable: false, // Founder/god rights - can be made true later
    ruleType: 'link'
  }));

  const directionalRules: UserVisibleRule[] = ENTITY_RULES.DIRECTIONAL_RULES.map((rule, index) => ({
    id: `directional-${index}`,
    name: `${rule.linkType} Workflow Rule`,
    description: `When ${rule.trigger} triggers ${rule.action} in ${rule.direction} direction`,
    sourceEntity: rule.linkType.split('_')[0].toLowerCase() as EntityType,
    targetEntity: rule.linkType.split('_')[1].toLowerCase() as EntityType,
    trigger: rule.trigger,
    action: rule.action,
    userEditable: false, // Founder/god rights - can be made true later
    ruleType: 'directional'
  }));

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'cascade': return '🗑️';
      case 'prompt': return '❓';
      case 'block': return '🚫';
      case 'ignore': return '👁️';
      case 'propagate': return '📡';
      case 'create_target': return '➕';
      case 'update_target': return '🔄';
      case 'delete_target': return '🗑️';
      case 'propagate_status': return '📊';
      default: return '⚙️';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'cascade': return 'destructive';
      case 'prompt': return 'secondary';
      case 'block': return 'destructive';
      case 'ignore': return 'outline';
      case 'propagate': return 'default';
      case 'create_target': return 'default';
      case 'update_target': return 'secondary';
      case 'delete_target': return 'destructive';
      case 'propagate_status': return 'default';
      default: return 'outline';
    }
  };

  return (
    <TabsContent value="link-rules" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Entity Relationship Rules & Workflows
            <Badge variant="outline" className="ml-2">
              Founder View
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="link-rules" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="link-rules">
                Link Rules ({linkRules.length})
              </TabsTrigger>
              <TabsTrigger value="directional-rules">
                Workflow Rules ({directionalRules.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[600px] mt-4">
              <TabsContent value="link-rules" className="space-y-4">
                <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">🔗 Link Rules</h3>
                  <p className="text-sm text-muted-foreground">
                    Define what happens when entities are deleted, updated, or modified.
                    These rules ensure data integrity and prevent orphaned relationships.
                  </p>
                </div>

                {linkRules.map(rule => (
                  <Card key={rule.id} className="hover:bg-accent/5 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-sm font-medium">
                            {rule.name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {rule.ruleType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {rule.userEditable ? (
                            <Eye className="w-4 h-4 text-green-500"  />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground"  />
                          )}
                          <Shield className="w-4 h-4 text-muted-foreground"  />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {rule.sourceEntity.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Source Entity
                            </div>
                          </div>
                          
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {rule.targetEntity.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Target Entity
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Trigger</div>
                            <Badge variant="outline" className="text-xs">
                              {rule.trigger}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Actions</div>
                            <div className="flex gap-1 flex-wrap">
                              {rule.action.split('/').map((action, index) => (
                                <Badge 
                                  key={index}
                                  variant={getActionColor(action) as any}
                                  className="text-xs"
                                >
                                  {getActionIcon(action)} {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {rule.description}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="directional-rules" className="space-y-4">
                <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2">⚡ Workflow Rules</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically trigger actions when entities change state.
                    These rules power the Links System&apos;s automatic entity creation and updates.
                  </p>
                </div>

                {directionalRules.map(rule => (
                  <Card key={rule.id} className="hover:bg-accent/5 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-sm font-medium">
                            {rule.name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {rule.ruleType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {rule.userEditable ? (
                            <Eye className="w-4 h-4 text-green-500"  />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground"  />
                          )}
                          <Shield className="w-4 h-4 text-muted-foreground"  />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {rule.sourceEntity.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Source Entity
                            </div>
                          </div>
                          
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {rule.targetEntity.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Target Entity
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Trigger</div>
                            <Badge variant="secondary" className="text-xs">
                              {rule.trigger}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Action</div>
                            <Badge 
                              variant={getActionColor(rule.action) as any}
                              className="text-xs"
                            >
                              {getActionIcon(rule.action)} {rule.action}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {rule.description}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Total: {linkRules.length + directionalRules.length} rules configured
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                Edit Rules (Coming Soon)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
