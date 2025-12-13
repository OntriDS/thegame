import { useState } from 'react';
import { Node } from 'reactflow';
import { DiagramCanvas } from './diagram/diagram-canvas';
import { Sidebar } from './diagram/sidebar';
import { PropertiesPanel } from './diagram/properties-panel';
import { TabsContent } from '@/components/ui/tabs';

export function DiagramBuilderTab() {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    return (
        <TabsContent value="diagrams" className="h-[calc(100vh-200px)] min-h-[600px] border border-white/10 rounded-lg overflow-hidden flex shadow-2xl shadow-black/50">
            <Sidebar />
            <DiagramCanvas onNodeSelect={setSelectedNode} />
            <PropertiesPanel selectedNode={selectedNode} />
        </TabsContent>
    );
}
