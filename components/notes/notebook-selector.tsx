'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotebookEditorModal } from './notebook-editor-modal';
import { 
  BookOpen, 
  Target, 
  Wrench, 
  CalendarDays, 
  Zap, 
  Lightbulb, 
  FileText,
  Plus
} from 'lucide-react';
import { NotebookType } from '@/types/enums';

interface NotebookSelectorProps {
  selectedNotebook: string;
  onNotebookChange: (notebookId: string) => void;
  noteCounts: Record<string, number>;
  notebooks: any[];
  onCreateNotebook: () => void;
  onEditNotebook: (notebook: any) => void;
  onSaveNotebook: (notebook: any) => void;
  onDeleteNotebook: (notebookId: string) => void;
}

const notebookConfig = [
  { 
    id: NotebookType.ALL_NOTES, 
    label: 'All Notes', 
    icon: BookOpen,
    color: 'text-blue-600'
  },
  { 
    id: NotebookType.CURRENT_SPRINT, 
    label: 'Current Sprint', 
    icon: Target,
    color: 'text-green-600'
  },
  { 
    id: NotebookType.CHALLENGES, 
    label: 'Challenges', 
    icon: Wrench,
    color: 'text-red-600'
  },
  { 
    id: NotebookType.ROAD_AHEAD, 
    label: 'Road Ahead', 
    icon: CalendarDays,
    color: 'text-purple-600'
  },
  { 
    id: NotebookType.STRATEGY, 
    label: 'Strategy', 
    icon: Zap,
    color: 'text-orange-600'
  },
  { 
    id: NotebookType.IDEAS, 
    label: 'Ideas', 
    icon: Lightbulb,
    color: 'text-yellow-600'
  },
  { 
    id: NotebookType.GENERAL, 
    label: 'General', 
    icon: FileText,
    color: 'text-gray-600'
  }
];

export function NotebookSelector({
  selectedNotebook,
  onNotebookChange,
  noteCounts,
  notebooks,
  onCreateNotebook,
  onEditNotebook,
  onSaveNotebook,
  onDeleteNotebook
}: NotebookSelectorProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<any>(null);

  const handleCreateNotebook = () => {
    setEditingNotebook(null);
    setIsEditorOpen(true);
  };

  const handleEditNotebook = (notebook: any) => {
    setEditingNotebook(notebook);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingNotebook(null);
  };

  const handleSaveNotebook = (notebookData: any) => {
    onSaveNotebook(notebookData);
    handleCloseEditor();
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateNotebook}
          className="h-8 px-3 text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Notebook
        </Button>
      </div>
      
      <div className="space-y-1">
        {notebooks.map((notebook) => {
          // Import the icon component dynamically
          const Icon = require('lucide-react')[notebook.icon] || BookOpen;
          const count = noteCounts[notebook.id] || 0;
          
          return (
            <Button
              key={notebook.id}
              variant={selectedNotebook === notebook.id ? "default" : "ghost"}
              className={`w-full justify-start h-8 px-2 ${
                selectedNotebook === notebook.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
              onClick={() => onNotebookChange(notebook.id)}
              onDoubleClick={() => handleEditNotebook(notebook)}
              title="Double-click to edit"
            >
              <Icon className={`h-4 w-4 mr-2 ${
                selectedNotebook === notebook.id ? 'text-primary-foreground' : notebook.color
              }`} />
              <span className="flex-1 text-left text-sm">{notebook.label}</span>
              {count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Notebook Editor Modal */}
      <NotebookEditorModal
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        notebook={editingNotebook}
        onSave={handleSaveNotebook}
        onDelete={onDeleteNotebook}
      />
    </div>
  );
}
