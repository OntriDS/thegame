import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Notebook } from '@/types/entities';
import { NotebookType, NoteColor } from '@/types/enums';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { 
  BookOpen, 
  Trash2, 
  Palette,
  Settings,
  Target,
  Wrench,
  CalendarDays,
  Zap,
  Lightbulb,
  FileText,
  Brain,
  Home,
  Plus
} from 'lucide-react';

interface NotebookEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebook: Notebook | null;
  onSave: (notebook: Partial<Notebook>) => void;
  onDelete: (notebookId: string) => void;
}

const colorOptions = Object.values(NoteColor).map(color => ({
  value: color,
  label: color.charAt(0).toUpperCase() + color.slice(1),
  class: color === NoteColor.WHITE 
    ? 'bg-card border-border' 
    : `bg-${color}-50/50 border-${color}-200 dark:bg-${color}-950/20 dark:border-${color}-800/50`
}));

const iconOptions = [
  { name: 'BookOpen', component: BookOpen },
  { name: 'Target', component: Target },
  { name: 'Wrench', component: Wrench },
  { name: 'CalendarDays', component: CalendarDays },
  { name: 'Zap', component: Zap },
  { name: 'Lightbulb', component: Lightbulb },
  { name: 'FileText', component: FileText },
  { name: 'Brain', component: Brain },
  { name: 'Home', component: Home }
];

export function NotebookEditorModal({
  isOpen,
  onClose,
  notebook,
  onSave,
  onDelete
}: NotebookEditorModalProps) {
  const [selectedNotebook, setSelectedNotebook] = useState<string>('add_new');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: NotebookType.GENERAL as string,
    color: NoteColor.WHITE,
    icon: 'BookOpen'
  });

  // Available notebooks (predefined ones)
  const availableNotebooks = [
    { id: 'add_new', label: 'Add New Notebook', icon: Plus },
    { id: NotebookType.ALL_NOTES, label: 'All Notes', icon: BookOpen },
    { id: NotebookType.CURRENT_SPRINT, label: 'Current Sprint', icon: Target },
    { id: NotebookType.CHALLENGES, label: 'Challenges', icon: Wrench },
    { id: NotebookType.ROAD_AHEAD, label: 'Road Ahead', icon: CalendarDays },
    { id: NotebookType.STRATEGY, label: 'Strategy', icon: Zap },
    { id: NotebookType.IDEAS, label: 'Ideas', icon: Lightbulb },
    { id: NotebookType.GENERAL, label: 'General', icon: FileText }
  ];

  useEffect(() => {
    if (notebook) {
      setSelectedNotebook(notebook.id || 'add_new');
      setFormData({
        name: (notebook as any).label || notebook.name || '',
        type: notebook.id || NotebookType.GENERAL,
        color: (notebook.color as NoteColor) || NoteColor.WHITE,
        icon: notebook.icon || 'BookOpen'
      });
    } else {
      setSelectedNotebook('add_new');
      setFormData({
        name: '',
        type: NotebookType.GENERAL as string,
        color: NoteColor.WHITE,
        icon: 'BookOpen'
      });
    }
  }, [notebook]);

  const handleSave = () => {
    if (selectedNotebook === 'add_new' && !formData.name.trim()) return;

    const notebookData: Partial<Notebook> = {
      ...formData,
      name: selectedNotebook === 'add_new' ? formData.name.trim() : availableNotebooks.find(n => n.id === selectedNotebook)?.label || '',
      type: selectedNotebook === 'add_new' ? formData.type : selectedNotebook,
      color: formData.color,
      icon: formData.icon,
      updatedAt: new Date()
    };

    onSave(notebookData);
    onClose();
  };

  const isAddNew = selectedNotebook === 'add_new';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${getZIndexClass('MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Add/Edit Notebooks
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Notebook Selection */}
          <div className="space-y-2">
            <Label>Select Notebook</Label>
            <Select
              value={selectedNotebook}
              onValueChange={(value) => {
                setSelectedNotebook(value);
                if (value !== 'add_new') {
                  const selected = availableNotebooks.find(n => n.id === value);
                  if (selected) {
                    setFormData(prev => ({
                      ...prev,
                      type: value,
                      color: NoteColor.WHITE // Default color
                    }));
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableNotebooks.map((notebook) => {
                  const Icon = notebook.icon;
                  return (
                    <SelectItem key={notebook.id} value={notebook.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {notebook.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Name Field - Only show when adding new */}
          {isAddNew && (
            <div className="space-y-2">
              <Label htmlFor="name">Notebook Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My Research Notebook"
              />
            </div>
          )}

          {/* Icon and Color Selection - Two Columns */}
          <div className="grid grid-cols-2 gap-6">
            {/* Icon Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Icon
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {iconOptions.map((icon) => {
                  const IconComponent = icon.component;
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: icon.name }))}
                      className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                        formData.icon === icon.name
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20 scale-105'
                          : 'border-border hover:border-primary/50'
                      }`}
                      title={icon.name}
                    >
                      <IconComponent className="h-4 w-4 mx-auto" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                      formData.color === color.value
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 scale-105'
                        : 'border-border hover:border-primary/50'
                    }`}
                    title={color.label}
                  >
                    <div className="w-4 h-4 rounded-full mx-auto shadow-sm" style={{
                      backgroundColor: color.value === NoteColor.WHITE ? '#f8fafc' : 
                        color.value === NoteColor.ORANGE ? '#fb923c' :
                        color.value === NoteColor.PURPLE ? '#a855f7' :
                        color.value === NoteColor.GREEN ? '#22c55e' :
                        color.value === NoteColor.BLUE ? '#3b82f6' :
                        color.value === NoteColor.YELLOW ? '#eab308' :
                        color.value === NoteColor.PINK ? '#ec4899' :
                        color.value === NoteColor.RED ? '#ef4444' :
                        color.value === NoteColor.GRAY ? '#6b7280' : '#f8fafc'
                    }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Actions */}
        <DialogFooter className="flex items-center justify-between pt-4">
          <div className="flex gap-2 pl-2">
          {!isAddNew && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="text-red-600 border-red-600 hover:bg-red-50 h-8 px-2"
                  title="Delete notebook"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
            )}

            <p className="text-center text-xs text-muted-foreground">
              To change available icons, modify them in this document: <code className="bg-muted px-1 rounded">components/notes/notebook-editor-modal.tsx</code>
            </p>
            
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isAddNew ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Update
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className={`max-w-md ${getZIndexClass('CRITICAL')}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Notebook
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this notebook? There is no going back.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                onDelete(selectedNotebook);
                setShowDeleteConfirm(false);
                onClose();
              }} 
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}