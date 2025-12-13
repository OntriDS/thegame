'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Cpu, Layout, ShoppingCart, Zap } from 'lucide-react';

const NODE_TYPES = {
    ADMIN: {
        color: 'border-cyan-500',
        glow: 'shadow-[0_0_30px_rgba(6,182,212,0.4)]',
        text: 'text-cyan-400',
        bg: 'bg-cyan-950/30'
    },
    PRODUCTION: {
        color: 'border-green-500',
        glow: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]',
        text: 'text-green-400',
        bg: 'bg-green-950/30'
    },
    SALES: {
        color: 'border-orange-500',
        glow: 'shadow-[0_0_30px_rgba(249,115,22,0.4)]',
        text: 'text-orange-400',
        bg: 'bg-orange-950/30'
    },
    CREATIVE: {
        color: 'border-purple-500',
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
        text: 'text-purple-400',
        bg: 'bg-purple-950/30'
    },
};

const ICONS = {
    ADMIN: Cpu,
    PRODUCTION: Zap,
    SALES: ShoppingCart,
    CREATIVE: Layout,
};

export const CustomNode = memo(({ data, selected }: NodeProps) => {
    const type = (data.type as keyof typeof NODE_TYPES) || 'ADMIN';
    const style = NODE_TYPES[type];
    const Icon = ICONS[type] || Cpu;

    return (
        <div className="relative group">
            {/* Handles for connections */}
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <Handle type="source" position={Position.Bottom} className="opacity-0" />

            <div className={`relative min-w-[200px] flex flex-col items-center`}>

                {/* THE POP-OUT ICON (The "Isometric" Effect) - DIRECT PORT FROM STITCH */}
                <div className={`absolute -top-8 z-20 transition-transform duration-300 group-hover:scale-110 ${selected ? 'scale-110' : ''}`}>
                    <div className={`w-16 h-16 ${style.bg} backdrop-blur-md border-2 ${style.color} rounded-xl rotate-45 flex items-center justify-center ${style.glow} shadow-lg`}>
                        <div className="-rotate-45">
                            <Icon className={`w-8 h-8 ${style.text}`} />
                        </div>
                    </div>
                </div>

                {/* THE CARD BODY - DIRECT PORT FROM STITCH */}
                <div className={`mt-0 pt-10 pb-4 px-6 w-full ${style.bg} backdrop-blur-xl border ${style.color} rounded-lg border-opacity-60 hover:border-opacity-100 transition-all ${selected ? 'ring-2 ring-white/20' : ''}`}>

                    <div className="flex flex-col items-center text-center space-y-2">
                        <h3 className={`font-mono font-bold tracking-[0.2em] text-sm ${style.text} uppercase`}>
                            {data.label}
                        </h3>
                    </div>

                    {/* Decorative Corner Accents */}
                    <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-l-2 border-b-2 ${style.color}`} />
                    <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-r-2 border-b-2 ${style.color}`} />
                </div>

                {/* CONNECTION LINE STUB (Visual Only) */}
                <div className={`absolute -bottom-4 w-0.5 h-4 ${style.bg} ${style.color} border-l`} />
            </div>
        </div>
    );
});

CustomNode.displayName = 'CustomNode';
