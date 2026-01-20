'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
    Box,
    Cpu,
    Zap,
    ShoppingCart,
    Layout,
    Plus,
    Minus,
    Maximize,
    RefreshCw,
    Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Diagram {
    id: string;
    name: string;
    icon: React.ReactNode;
    imagePath: string;
    description: string;
}

const diagrams: Diagram[] = [
    {
        id: 'akiles-ecosystem',
        name: 'Akiles Ecosystem',
        icon: <Box className="h-5 w-5" />,
        imagePath: '/diagrams/Akiles-Ecosystem-Diagram.png',
        description: 'Comprehensive overview of the Akiles ecosystem.'
    },
    {
        id: 'rosetta-stone',
        name: 'System Architecture',
        icon: <Cpu className="h-5 w-5" />,
        imagePath: '/diagrams/TheGame-RossettaStone-System-Architecture.png',
        description: 'Detailed technical architecture and entity relationships.'
    },
    // Placeholders for future diagrams based on common icons
    {
        id: 'placeholder-1',
        name: 'Power Grid',
        icon: <Zap className="h-5 w-5" />,
        imagePath: '', // Placeholder
        description: 'Power distribution and energy flow.'
    },
    {
        id: 'placeholder-2',
        name: 'Marketplace',
        icon: <ShoppingCart className="h-5 w-5" />,
        imagePath: '', // Placeholder
        description: 'Marketplace and transaction flows.'
    },
    {
        id: 'placeholder-3',
        name: 'Layouts',
        icon: <Layout className="h-5 w-5" />,
        imagePath: '', // Placeholder
        description: 'UI/UX Layout structures.'
    }
];

export function DiagramsViewerTab() {
    const [selectedDiagramId, setSelectedDiagramId] = useState<string>(diagrams[0].id);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    const selectedDiagram = diagrams.find(d => d.id === selectedDiagramId) || diagrams[0];

    // Reset zoom/pan when diagram changes
    useEffect(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    }, [selectedDiagramId]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));
    const handleReset = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <TabsContent value="diagrams" className="h-[calc(100vh-200px)] min-h-[600px] border border-white/10 rounded-lg overflow-hidden flex shadow-2xl shadow-black/50 bg-[#050505]">

            {/* Sidebar Navigation */}
            <div className="w-16 flex-shrink-0 border-r border-white/10 bg-black/40 flex flex-col items-center py-4 gap-4 z-10">
                {diagrams.map(diagram => (
                    <button
                        key={diagram.id}
                        onClick={() => setSelectedDiagramId(diagram.id)}
                        className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                            selectedDiagramId === diagram.id
                                ? "bg-primary/20 text-primary border border-primary/50 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                        title={diagram.name}
                    >
                        {diagram.icon}
                    </button>
                ))}

                {/* Placeholder for Adding Diagrams */}
                <div className="mt-auto pt-4 border-t border-white/10 w-full flex justify-center">
                    <button
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                        title="Add Diagram (Placeholder)"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Viewer Area */}
            <div className="flex-grow relative h-full w-full overflow-hidden bg-[#0a0a0a]">

                {/* Viewport */}
                <div
                    ref={containerRef}
                    className={cn(
                        "w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden",
                        isDragging && "cursor-grabbing"
                    )}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            if (e.deltaY < 0) handleZoomIn();
                            else handleZoomOut();
                        }
                    }}
                >
                    {selectedDiagram.imagePath ? (
                        <div
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                            }}
                            className="relative"
                        >
                            {/* Using standard img tag for drag/drop flexibility and preventing Next.js Image strict sizing issues in this interactive context, 
                  but can switch to Next/Image if needed with layout='fill' and object-contain in a wrapper */}
                            <img
                                src={selectedDiagram.imagePath}
                                alt={selectedDiagram.name}
                                draggable={false}
                                className="max-w-none shadow-2xl"
                                style={{
                                    // Prevent image selection during drag
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 gap-4">
                            <ImageIcon className="h-16 w-16 opacity-20" />
                            <p>No image available for {selectedDiagram.name}</p>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Upload Diagram
                            </Button>
                        </div>
                    )}
                </div>

                {/* Floating Controls */}
                <div className="absolute bottom-6 left-6 flex flex-col gap-2 p-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10"
                        onClick={handleZoomIn}
                        title="Zoom In"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10"
                        onClick={handleZoomOut}
                        title="Zoom Out"
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <div className="h-px w-full bg-white/10 my-0.5" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10"
                        onClick={handleReset}
                        title="Reset View"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10"
                        title="Fit to Screen (Placeholder)"
                    >
                        <Maximize className="h-4 w-4" />
                    </Button>
                </div>

                {/* Diagram Title Overlay */}
                <div className="absolute top-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full shadow-xl pointer-events-none">
                    <h3 className="text-white text-sm font-medium flex items-center gap-2">
                        <span className="text-primary">{selectedDiagram.icon}</span>
                        {selectedDiagram.name}
                    </h3>
                </div>

            </div>
        </TabsContent>
    );
}
