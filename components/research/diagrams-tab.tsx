'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useState } from 'react';
import { Eye, Maximize2, Layers, GitBranch } from 'lucide-react';

interface DiagramInfo {
  id: string;
  name: string;
  fileName: string;
  description: string;
  category: 'architecture' | 'ecosystem';
  width: number;
  height: number;
}

const diagrams: DiagramInfo[] = [
  {
    id: 'akiles-ecosystem',
    name: 'Akiles Ecosystem Diagram',
    fileName: 'Akiles-Ecosystem-Diagram.png',
    description: 'Comprehensive overview of the entire Akiles ecosystem, showing the relationships between different systems, platforms, and components.',
    category: 'ecosystem',
    width: 1200,
    height: 800
  },
  {
    id: 'rosetta-stone-architecture',
    name: 'TheGame Rosetta Stone System Architecture',
    fileName: 'TheGame-RossettaStone-System-Architecture.png',
    description: 'Detailed technical architecture of TheGame system, illustrating the Rosetta Stone pattern, entity relationships, and system components.',
    category: 'architecture',
    width: 1200,
    height: 800
  }
];

export function DiagramsTab() {
  const [selectedDiagram, setSelectedDiagram] = useState<DiagramInfo | null>(null);

  const getCategoryIcon = (category: string) => {
    return category === 'architecture' ? <Layers className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    return category === 'architecture' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  return (
    <TabsContent value="diagrams" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            System Diagrams
          </CardTitle>
          <CardDescription>
            Visual representations of system architecture, workflows, and ecosystem relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {diagrams.map((diagram) => (
              <Card key={diagram.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{diagram.name}</CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className={`flex items-center gap-1 ${getCategoryColor(diagram.category)}`}
                        >
                          {getCategoryIcon(diagram.category)}
                          {diagram.category}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {diagram.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Thumbnail Preview */}
                    <div className="relative bg-gray-50 rounded-lg overflow-hidden border">
                      <Image
                        src={`/diagrams/${diagram.fileName}`}
                        alt={diagram.name}
                        width={400}
                        height={300}
                        className="w-full h-48 object-contain cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setSelectedDiagram(diagram)}
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <Button size="sm" variant="outline">
                          <Maximize2 className="h-4 w-4 mr-2" />
                          View Full Size
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setSelectedDiagram(diagram)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Full
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-7xl max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle>{diagram.name}</DialogTitle>
                            <DialogDescription>{diagram.description}</DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[80vh]">
                            <div className="flex justify-center p-4">
                              <Image
                                src={`/diagrams/${diagram.fileName}`}
                                alt={diagram.name}
                                width={diagram.width}
                                height={diagram.height}
                                className="max-w-full h-auto"
                                style={{ maxHeight: '70vh' }}
                                priority={true}
                              />
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </CardContent>
      </Card>
    </TabsContent>
  );
}
