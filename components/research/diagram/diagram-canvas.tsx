import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Edge,
    Node,
    NodeTypes,
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Connection,
    ConnectionMode,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './custom-node';

const nodeTypes: NodeTypes = {
    custom: CustomNode,
};

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

const initialEdges: Edge[] = [];

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

// Generates correct color based on connection source (could be enhanced later)
const getEdgeStyle = (color: string) => ({
    stroke: color,
    strokeWidth: 2,
    filter: `drop-shadow(0 0 3px ${color})`,
});

let id = 0;
const getId = () => `dndnode_${id++}`;

const DiagramCanvasContent = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2, filter: 'drop-shadow(0 0 3px #06b6d4)' } }, eds)),
        [],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
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
                data: { label: `${type} Node`, type: type },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance],
    );

    return (
        <div className="flex-grow h-full w-full bg-[#050505]" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
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
                <Controls className="bg-black/50 border border-white/10 text-white fill-white" />
            </ReactFlow>

            {/* FLOATING HUD INFO - Ported from Stitch */}
            <div className="absolute bottom-6 left-6 font-mono text-xs text-slate-500 pointer-events-none z-50">
                <p>SYSTEM: ONLINE</p>
                <p>MODE: EDIT</p>
            </div>
        </div>
    );
};

export const DiagramCanvas = () => (
    <ReactFlowProvider>
        <DiagramCanvasContent />
    </ReactFlowProvider>
);
