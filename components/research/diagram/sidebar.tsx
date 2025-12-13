import { Box, MousePointer2, Plus, Share2, Search, Cpu, Layout, ShoppingCart, Zap } from 'lucide-react';

export const Sidebar = () => {
    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-16 border-r border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md z-50 flex flex-col items-center py-6 gap-6 h-full">
            <div className="w-10 h-10 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-default" title="Diagram Builder">
                <Box size={24} />
            </div>

            <div className="flex flex-col gap-4 mt-8 w-full items-center">
                <div className="w-full h-px bg-white/10 my-2" />

                <div
                    className="dndnode p-3 text-cyan-400 hover:bg-cyan-900/20 rounded-lg transition-colors cursor-grab active:cursor-grabbing border border-cyan-500/30"
                    onDragStart={(event) => onDragStart(event, 'ADMIN')}
                    draggable
                    title="Admin Node"
                >
                    <Cpu size={20} />
                </div>

                <div
                    className="dndnode p-3 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors cursor-grab active:cursor-grabbing border border-green-500/30"
                    onDragStart={(event) => onDragStart(event, 'PRODUCTION')}
                    draggable
                    title="Production Node"
                >
                    <Zap size={20} />
                </div>

                <div
                    className="dndnode p-3 text-orange-400 hover:bg-orange-900/20 rounded-lg transition-colors cursor-grab active:cursor-grabbing border border-orange-500/30"
                    onDragStart={(event) => onDragStart(event, 'SALES')}
                    draggable
                    title="Sales Node"
                >
                    <ShoppingCart size={20} />
                </div>

                <div
                    className="dndnode p-3 text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors cursor-grab active:cursor-grabbing border border-purple-500/30"
                    onDragStart={(event) => onDragStart(event, 'CREATIVE')}
                    draggable
                    title="Creative Node"
                >
                    <Layout size={20} />
                </div>
            </div>
        </aside>
    );
};
