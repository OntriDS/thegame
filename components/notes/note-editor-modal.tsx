'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Note, Notebook } from '@/types/entities';
import { NotebookType, NoteColor, NOTE_TAGS } from '@/types/enums';
import { getZIndexClass } from '@/lib/utils/z-index-utils';
import { getColorLabel } from '@/lib/utils/note-color-utils';
import { parseRichText } from '@/lib/utils/rich-text-utils';
import { RichTextEditor } from './rich-text-editor';
import { 
  Pin, 
  Archive, 
  Tag, 
  X, 
  BookOpen,
  Eye,
  EyeOff,
  Trash2,
  Code
} from 'lucide-react';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  notebooks: Notebook[];
  notes: Note[];
  onSave: (note: Partial<Note>) => void;
  onDelete: (noteId: string) => void;
}


export function NoteEditorModal({
  isOpen,
  onClose,
  note,
  notebooks,
  notes,
  onSave,
  onDelete
}: NoteEditorModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHtmlView, setShowHtmlView] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    notebookId: NotebookType.GENERAL as string,
    tags: [] as string[],
    isPinned: false,
    isClosed: false,
    isHidden: false
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        content: note.content,
        notebookId: note.notebookId,
        tags: [...note.tags],
        isPinned: note.isPinned,
        isClosed: note.isClosed,
        isHidden: note.isHidden
      });
    } else {
      setFormData({
        title: '',
        content: '',
        notebookId: NotebookType.GENERAL as string,
        tags: [],
        isPinned: false,
        isClosed: false,
        isHidden: false
      });
    }
  }, [note]);

  // Keyboard shortcuts for checkmark and cross
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && isOpen) {
        if (e.key === 'g') {
          e.preventDefault();
          document.execCommand('insertHTML', false, ' ✅ ');
        } else if (e.key === 'w') {
          e.preventDefault();
          document.execCommand('insertHTML', false, ' ❌ ');
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }

    // Get the notebook color from the notebooks prop
    const selectedNotebook = notebooks.find(nb => nb.id === formData.notebookId);
    const notebookColor = selectedNotebook?.color || 'text-blue-600';

    const noteData: Partial<Note> = {
      ...formData,
      title: formData.title.trim(),
      content: formData.content.trim(),
      tags: formData.tags.filter(tag => tag.trim()),
      color: notebookColor, // Use notebook's color
      updatedAt: new Date()
    };

    if (note) {
      noteData.id = note.id;
    }

    onSave(noteData);
    onClose();
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-6xl h-[80vh] ${getZIndexClass('MODALS')}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {note ? 'Edit Note' : 'Create Note'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Main Content Area - Left Side */}
          <div className="col-span-9 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Note title..."
                className="text-lg"
              />
            </div>

            {/* Rich Text Content */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Content</Label>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('insertHTML', false, ' ✅ ');
                    }}
                    title="Insert checkmark (Ctrl+G)"
                  >
                    ✅
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('insertHTML', false, ' ❌ ');
                    }}
                    title="Insert cross (Ctrl+W)"
                  >
                    ❌
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('bold');
                    }}
                    title="Bold (Ctrl+B)"
                  >
                    <strong>B</strong>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const selectedText = selection.toString();
                        if (selectedText) {
                          const headingHtml = `<h1 class="text-lg font-bold text-foreground mb-2 mt-4">${selectedText}</h1>`;
                          range.deleteContents();
                          range.insertNode(document.createRange().createContextualFragment(headingHtml));
                        } else {
                          document.execCommand('insertHTML', false, '<h1 class="text-lg font-bold text-foreground mb-2 mt-4">H1 Heading</h1>');
                        }
                      }
                    }}
                    title="H1 Header (Ctrl+1)"
                  >
                    H1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const selectedText = selection.toString();
                        if (selectedText) {
                          const headingHtml = `<h2 class="text-base font-semibold text-foreground mb-2 mt-3">${selectedText}</h2>`;
                          range.deleteContents();
                          range.insertNode(document.createRange().createContextualFragment(headingHtml));
                        } else {
                          document.execCommand('insertHTML', false, '<h2 class="text-base font-semibold text-foreground mb-2 mt-3">H2 Heading</h2>');
                        }
                      }
                    }}
                    title="H2 Header (Ctrl+2)"
                  >
                    H2
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const selectedText = selection.toString();
                        if (selectedText) {
                          const headingHtml = `<h3 class="text-sm font-semibold text-foreground mb-1 mt-2">${selectedText}</h3>`;
                          range.deleteContents();
                          range.insertNode(document.createRange().createContextualFragment(headingHtml));
                        } else {
                          document.execCommand('insertHTML', false, '<h3 class="text-sm font-semibold text-foreground mb-1 mt-2">H3 Heading</h3>');
                        }
                      }
                    }}
                    title="H3 Header (Ctrl+3)"
                  >
                    H3
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const selectedText = selection.toString();
                        if (selectedText) {
                          const codeHtml = `<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">${selectedText}</code>`;
                          range.deleteContents();
                          range.insertNode(document.createRange().createContextualFragment(codeHtml));
                        } else {
                          document.execCommand('insertHTML', false, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">code</code>');
                        }
                      }
                    }}
                    title="Inline Code (Ctrl+5)"
                  >
                    <code>c</code>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('insertHTML', false, '<pre class="bg-muted p-2 rounded text-sm font-mono overflow-x-auto my-2"><code>Code block</code></pre>');
                    }}
                    title="Code Block (Ctrl+4)"
                  >
                    <Code className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('insertHTML', false, '<hr class="my-2 border-border" />');
                    }}
                    title="Divider (Ctrl+D)"
                  >
                    —
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('insertHTML', false, '<li class="ml-4 mb-1 list-disc">List item</li>');
                    }}
                    title="Bullet List (Ctrl+L)"
                  >
                    •
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('insertHTML', false, '<li class="ml-4 mb-1">List item</li>');
                    }}
                    title="Numbered List (Ctrl+O)"
                  >
                    1.
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      // The RichTextEditor component handles the link modal
                      // This button is just for visual consistency in the toolbar
                      const event = new KeyboardEvent('keydown', {
                        key: 'i',
                        ctrlKey: true,
                        bubbles: true
                      });
                      document.dispatchEvent(event);
                    }}
                    title="Link (Ctrl+I)"
                  >
                    🔗
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('undo');
                    }}
                    title="Undo (Ctrl+Z)"
                  >
                    ↶
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      document.execCommand('redo');
                    }}
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    ↷
                  </Button>
                  <Button
                    type="button"
                    variant={showHtmlView ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setShowHtmlView(!showHtmlView)}
                    title="Toggle HTML view"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {showHtmlView ? (
                <div className="border rounded-md p-3 bg-muted/30 h-[calc(80vh-200px)] overflow-y-auto">
                  <div className="text-sm font-mono whitespace-pre-wrap">
                    {formData.content}
                  </div>
                </div>
              ) : (
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="Write your note here... Use **bold**, add --- for dividers, and ## for headings"
                  className="h-[calc(80vh-200px)]"
                />
              )}
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="lg:col-span-3 col-span-12 space-y-3">
            {/* Notebook */}
            <div className="space-y-1">
              <Label className="text-sm">Notebook</Label>
              <Select
                value={formData.notebookId}
                onValueChange={(value) => {
                  const selectedNotebook = notebooks.find(nb => nb.id === value);
                  const notebookColor = selectedNotebook?.color || 'text-blue-600';
                  
                  setFormData(prev => ({ 
                    ...prev, 
                    notebookId: value,
                    color: notebookColor
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notebooks.map((nb) => (
                    <SelectItem key={nb.id} value={nb.id}>
                      {(nb as any).label || nb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm">
                <Tag className="h-3 w-3" />
                Tags
              </Label>
              <div className="space-y-2">
                {/* Tag Selection */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Add Tag:</Label>
                  <SearchableSelect
                    value=""
                    onValueChange={(value) => {
                      if (value && !formData.tags.includes(value)) {
                        setFormData(prev => ({
                          ...prev,
                          tags: [...prev.tags, value]
                        }));
                      }
                    }}
                    placeholder="Select a Tag"
                    options={[
                      // Business Structure tags
                      ...NOTE_TAGS.map(tag => ({ 
                        value: tag, 
                        label: tag,
                        group: 'Business Structure'
                      })),
                      // Custom tags from ALL notes
                      ...Array.from(new Set(
                        notes.flatMap(note => note.tags || [])
                          .filter(tag => !NOTE_TAGS.includes(tag as any))
                      )).map(tag => ({ 
                        value: tag, 
                        label: tag,
                        group: 'Others'
                      }))
                    ]}
                    className="w-full"
                  />
                </div>
                
                {/* Custom Tag Input */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Custom Tag:</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Type custom tag..."
                      className="h-8"
                      onKeyPress={handleKeyPress}
                    />
                    <Button onClick={handleAddTag} size="sm" disabled={!newTag} className="h-8 px-3">
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 text-xs">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Options</Label>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                    className="rounded"
                  />
                  <Pin className="h-4 w-4" />
                  Pin to top
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.isClosed}
                    onChange={(e) => setFormData(prev => ({ ...prev, isClosed: e.target.checked }))}
                    className="rounded"
                  />
                  <Archive className="h-4 w-4" />
                  Close
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.isHidden}
                    onChange={(e) => setFormData(prev => ({ ...prev, isHidden: e.target.checked }))}
                    className="rounded"
                  />
                  <EyeOff className="h-4 w-4" />
                  Hide
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex flex-col gap-6">

                <div className="flex gap-4">
                  {note && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-600 hover:bg-red-50 h-8"
                      onClick={() => setShowDeleteConfirm(true)}
                      title="Delete note"
                    >
                      <Trash2 className="h-4 w-4 mr-0" />
                    </Button>
                  )}
                  <Button variant="outline" onClick={onClose} className="flex-1 h-8 text-sm">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={!formData.title.trim() || !formData.content.trim()}
                    className="flex-1 h-8 text-sm"
                  >
                    {note ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className={`max-w-md ${getZIndexClass('MODALS')}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Note
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this note? There is no going back.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => {
              onDelete(note!.id);
              setShowDeleteConfirm(false);
              onClose();
            }} className="text-red-600 border-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContent>
  </Dialog>
  );
}
