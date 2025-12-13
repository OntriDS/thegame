'use client';

import { useState, useEffect } from 'react';
import { Node, ReactFlowProvider } from 'reactflow';
import { DiagramCanvas } from './diagram/diagram-canvas';
import { Sidebar } from './diagram/sidebar';
import { PropertiesPanel } from './diagram/properties-panel';
import { TabsContent } from '@/components/ui/tabs';

export function DiagramBuilderTab() {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="h-[600px] w-full bg-[#050505] rounded-lg border border-white/10 flex items-center justify-center text-slate-500 font-mono text-sm">Initializing System...</div>;
    }

    return (
        <TabsContent value="diagrams" className="h-[calc(100vh-200px)] min-h-[600px] border border-white/10 rounded-lg overflow-hidden flex shadow-2xl shadow-black/50">
            <ReactFlowProvider>
                <Sidebar />
                <DiagramCanvas onNodeSelect={setSelectedNode} />
                <PropertiesPanel selectedNode={selectedNode} />
            </ReactFlowProvider>
        </TabsContent>
    );
}
