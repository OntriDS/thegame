'use client';

import { useState, useEffect, useMemo } from 'react';
import { Note } from '@/types/entities';
import { NotebookType } from '@/types/enums';
import { NoteCard } from './note-card';
import { NotebookSelector } from './notebook-selector';
import { NotesSearchFilter } from './notes-search-filter';
import { NoteEditorModal } from './note-editor-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Lightbulb } from 'lucide-react';

interface NotesGridProps {
  notes: Note[];
  notebooks: any[];
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onSaveNote: (note: Partial<Note>) => void;
  onCreateNotebook: () => void;
  onEditNotebook: (notebook: any) => void;
  onSaveNotebook: (notebook: any) => void;
  onDeleteNotebook: (notebookId: string) => void;
  onTogglePin?: (noteId: string) => void;
  onToggleArchive?: (noteId: string) => void;
  onToggleHidden?: (noteId: string) => void;
}

export function NotesGrid({
  notes,
  notebooks,
  onEditNote,
  onDeleteNote,
  onSaveNote,
  onCreateNotebook,
  onEditNotebook,
  onSaveNotebook,
  onDeleteNotebook,
  onTogglePin,
  onToggleArchive,
  onToggleHidden
}: NotesGridProps) {
  const [selectedNotebook, setSelectedNotebook] = useState<string>(NotebookType.ALL_NOTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showClosedOnly, setShowClosedOnly] = useState(false);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [showHiddenNotes, setShowHiddenNotes] = useState(true);
  const [selectedTag, setSelectedTag] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Calculate note counts per notebook
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(NotebookType).forEach(notebookType => {
      if (notebookType === NotebookType.ALL_NOTES) {
        counts[notebookType] = notes.length;
      } else {
        counts[notebookType] = notes.filter(note => note.notebookId === notebookType).length;
      }
    });
    return counts;
  }, [notes]);

  // Get available tags
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Filter by notebook
    if (selectedNotebook !== NotebookType.ALL_NOTES) {
      filtered = filtered.filter(note => note.notebookId === selectedNotebook);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by pinned status
    if (showPinnedOnly) {
      filtered = filtered.filter(note => note.isPinned);
    }

    // Filter by closed status
    if (showClosedOnly) {
      filtered = filtered.filter(note => note.isClosed);
    } else {
      // By default, hide closed notes unless specifically filtering for them
      filtered = filtered.filter(note => !note.isClosed);
    }

    // Filter by hidden status
    if (showHiddenOnly) {
      filtered = filtered.filter(note => note.isHidden);
    } else if (!showHiddenNotes) {
      // If showHiddenNotes is false, completely hide hidden notes
      filtered = filtered.filter(note => !note.isHidden);
    }
    // If showHiddenNotes is true, show all notes (hidden ones will be blurred in the UI)

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter(note => note.tags.includes(selectedTag));
    }

    // Sort notes
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Pinned notes first
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    return filtered;
  }, [notes, selectedNotebook, searchQuery, sortBy, sortOrder, showPinnedOnly, showClosedOnly, showHiddenOnly, showHiddenNotes, selectedTag]);

  // Modal handlers
  const handleCreateNote = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingNote(null);
  };

  const handleSaveNote = (noteData: Partial<Note>) => {
    onSaveNote(noteData);
    handleCloseEditor();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <NotebookSelector
              selectedNotebook={selectedNotebook}
              onNotebookChange={setSelectedNotebook}
              noteCounts={noteCounts}
              notebooks={notebooks}
              onCreateNotebook={onCreateNotebook}
              onEditNotebook={onEditNotebook}
              onSaveNotebook={onSaveNotebook}
              onDeleteNotebook={onDeleteNotebook}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <NotesSearchFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              showPinnedOnly={showPinnedOnly}
              onTogglePinnedOnly={() => setShowPinnedOnly(!showPinnedOnly)}
              showClosedOnly={showClosedOnly}
              onToggleClosedOnly={() => setShowClosedOnly(!showClosedOnly)}
              showHiddenOnly={showHiddenOnly}
              onToggleHiddenOnly={() => setShowHiddenOnly(!showHiddenOnly)}
              showHiddenNotes={showHiddenNotes}
              onToggleShowHiddenNotes={() => setShowHiddenNotes(!showHiddenNotes)}
              selectedTag={selectedTag}
              onTagChange={setSelectedTag}
              totalNotes={notes.length}
              filteredNotes={filteredNotes.length}
              notes={notes}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {selectedNotebook === NotebookType.ALL_NOTES 
                ? 'All Notes' 
                : Object.values(NotebookType).find(n => n === selectedNotebook)?.replace('_', ' ') || 'Notes'
              }
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={handleCreateNote} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>

        {/* Notes Grid */}
        {filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEditNote}
                onTogglePin={onTogglePin}
                onToggleArchive={onToggleArchive}
                onToggleHidden={onToggleHidden}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No notes found</p>
                <p className="text-sm mb-4">
                  {searchQuery || selectedTag || showPinnedOnly || showClosedOnly || showHiddenOnly
                    ? 'Try adjusting your filters or search terms'
                    : 'Create your first note to get started'
                  }
                </p>
                <Button onClick={handleCreateNote} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Note Editor Modal */}
      <NoteEditorModal
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        note={editingNote}
        notebooks={notebooks}
        notes={notes}
        onSave={handleSaveNote}
        onDelete={onDeleteNote}
      />
    </div>
  );
}
