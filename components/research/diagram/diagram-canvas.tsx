'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Node,
    NodeTypes,
    ReactFlowProvider,
    ConnectionMode,
    MarkerType,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    OnInit,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './custom-node';

const nodeTypes: NodeTypes = {
    custom: CustomNode,
};

// Custom edge styles to match neon aesthetic
const defaultEdgeOptions = {
    style: { strokeWidth: 2, stroke: '#64748b' },
    type: 'smoothstep',
    markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
    },
    animated: true,
};

interface DiagramCanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    onInit: OnInit;
    onDrop: (event: React.DragEvent) => void;
    onDragOver: (event: React.DragEvent) => void;
    onNodeSelect: (node: Node | null) => void;
}

export const DiagramCanvas = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onInit,
    onDrop,
    onDragOver,
    onNodeSelect
}: DiagramCanvasProps) => {

    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        if (onNodeSelect) {
            onNodeSelect(nodes.length > 0 ? nodes[0] : null);
        }
    }, [onNodeSelect]);

    return (
        <div className="flex-grow h-full w-full bg-[#050505]">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={onInit}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionMode={ConnectionMode.Loose}
                fitView
                className="bg-[#050505]"
            >
                <Background
                    color="#ffffff"
                    gap={40}
                    size={1}
                    style={{ opacity: 0.03 }}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] pointer-events-none" />
                <Controls className="bg-black/50 border border-white/10 !fill-white [&>button]:!bg-black/80 [&>button]:!border-white/20 [&>button:hover]:!bg-white/20 [&>button]:!fill-white [&>button_path]:!fill-white" />
            </ReactFlow>

            {/* FLOATING HUD INFO */}
            <div className="absolute bottom-6 left-6 font-mono text-xs text-slate-500 pointer-events-none z-50">
                <p>SYSTEM: ONLINE</p>
                <p>MODE: EDIT</p>
            </div>
        </div>
    );
};
