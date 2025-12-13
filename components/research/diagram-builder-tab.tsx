'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Node,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ReactFlowInstance
} from 'reactflow';
import { DiagramCanvas } from './diagram/diagram-canvas';
import { Sidebar } from './diagram/sidebar';
import { PropertiesPanel } from './diagram/properties-panel';
import { TabsContent } from '@/components/ui/tabs';

// Initial nodes can be defined here or imported
const initialNodes: Node[] = [
    {
        id: '1',
        type: 'custom',
        position: { x: 400, y: 300 },
        data: { label: 'Control Tower', type: 'ADMIN' }
    },
    {
        id: '2',
        type: 'custom',
        position: { x: 150, y: 150 },
        data: { label: 'Art Studio', type: 'CREATIVE' }
    },
    {
        id: '3',
        type: 'custom',
        position: { x: 700, y: 400 },
        data: { label: 'Exchange Hub', type: 'SALES' }
    },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

export function DiagramBuilderTab() {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Core React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#06b6d4', strokeWidth: 2, filter: 'drop-shadow(0 0 3px #06b6d4)' }
        }, eds)),
        []
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowInstance) return;

            const type = event.dataTransfer?.getData('application/reactflow');

            if (!type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: getId(),
                type: 'custom',
                position,
                data: { label: `New ${type} Node`, type: type },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const onNodeSelect = useCallback((node: Node | null) => {
        setSelectedNode(node);
    }, []);

    // Pass direct setNodes function to properties panel
    const updateNodes = setNodes;

    if (!isMounted) {
        return <div className="h-[600px] w-full bg-[#050505] rounded-lg border border-white/10 flex items-center justify-center text-slate-500 font-mono text-sm">Initializing System...</div>;
    }

    return (
        <TabsContent value="diagrams" className="h-[calc(100vh-200px)] min-h-[600px] border border-white/10 rounded-lg overflow-hidden flex shadow-2xl shadow-black/50">
            <ReactFlowProvider>
                <div className="flex w-full h-full" ref={reactFlowWrapper}>
                    <Sidebar />
                    <div className="flex-grow h-full w-full relative">
                        <DiagramCanvas
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onNodeSelect={onNodeSelect}
                        />
                    </div>
                    <PropertiesPanel selectedNode={selectedNode} setNodes={updateNodes} />
                </div>
            </ReactFlowProvider>
        </TabsContent>
    );
}
