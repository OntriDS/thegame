'use client';

import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Node } from 'reactflow';
import { Settings, MousePointer2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PropertiesPanelProps {
    selectedNode: Node | null;
    setNodes: Dispatch<SetStateAction<Node[]>>;
}

export const PropertiesPanel = ({ selectedNode, setNodes }: PropertiesPanelProps) => {
    const [label, setLabel] = useState('');
    const [type, setType] = useState('');

    // Update local state when selected node changes
    useEffect(() => {
        if (selectedNode) {
            setLabel(selectedNode.data.label);
            setType(selectedNode.data.type || 'ADMIN');
        }
    }, [selectedNode]);

    // Handle label change
    const handleLabelChange = (newLabel: string) => {
        setLabel(newLabel);
        if (setNodes && selectedNode) {
            setNodes((nodes: Node[]) =>
                nodes.map((node) => {
                    if (node.id === selectedNode.id) {
                        return {
                            ...node,
                            data: { ...node.data, label: newLabel },
                        };
                    }
                    return node;
                })
            );
        }
    };

    // Handle type change
    const handleTypeChange = (newType: string) => {
        setType(newType);
        if (setNodes && selectedNode) {
            setNodes((nodes: Node[]) =>
                nodes.map((node) => {
                    if (node.id === selectedNode.id) {
                        return {
                            ...node,
                            data: { ...node.data, type: newType },
                        };
                    }
                    return node;
                })
            );
        }
    };

    return (
        <aside className={`w-80 border-l border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl z-50 transition-all duration-300 transform ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-8 text-cyan-400">
                    <Settings size={18} />
                    <h2 className="font-mono font-bold tracking-widest uppercase text-sm">Node Properties</h2>
                </div>

                {selectedNode ? (
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs uppercase font-bold text-slate-500 mb-2 block font-mono">Label</label>
                            <Input
                                type="text"
                                value={label}
                                onChange={(e) => handleLabelChange(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 rounded p-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
                            />
                        </div>

                        <div>
                            <label className="text-xs uppercase font-bold text-slate-500 mb-2 block font-mono">Category Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['ADMIN', 'PRODUCTION', 'SALES', 'CREATIVE'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => handleTypeChange(t)}
                                        className={`text-[10px] py-2 border rounded hover:bg-white/5 transition-colors font-mono ${type === t ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-white/10 text-slate-400'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                        <MousePointer2 size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-mono">Select a node to edit</p>
                    </div>
                )}
            </div>
        </aside>
    );
};
