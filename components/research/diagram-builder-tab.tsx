import { DiagramCanvas } from './diagram/diagram-canvas';
import { Sidebar } from './diagram/sidebar';
import { TabsContent } from '@/components/ui/tabs';

export function DiagramBuilderTab() {
    return (
        <TabsContent value="diagrams" className="h-[calc(100vh-200px)] min-h-[600px] border border-white/10 rounded-lg overflow-hidden flex shadow-2xl shadow-black/50">
            <Sidebar />
            <DiagramCanvas />
        </TabsContent>
    );
}
