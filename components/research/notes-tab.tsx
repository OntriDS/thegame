'use client';

import { TabsContent } from '@/components/ui/tabs';
import { NotesGrid } from '@/components/notes/notes-grid';

interface NotesTabProps {
  notes: any[];
  notebooks: any[];
  onUpdateNotes: (notes: any[]) => void;
  onUpdateNotebooks: (notebooks: any[]) => void;
}

export function NotesTab({ notes, notebooks, onUpdateNotes, onUpdateNotebooks }: NotesTabProps) {
  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch('/api/notes-log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId })
      });
      if (response.ok) {
        onUpdateNotes(notes.filter(note => note.id !== noteId));
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleSaveNote = async (noteData: any) => {
    try {
      const response = await fetch('/api/notes-log', {
        method: noteData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
      if (response.ok) {
        const result = await response.json();
        if (noteData.id) {
          // Update existing note
          onUpdateNotes(notes.map(note => note.id === noteData.id ? result.note : note));
        } else {
          // Add new note
          onUpdateNotes([result.note, ...notes]);
        }
      }
    } catch (error) {
      console.error('Error saving Note:', error);
    }
  };

  const handleSaveNotebook = (notebookData: any) => {
    // Update the notebook in state and save to localStorage
    const updatedNotebooks = notebooks.map(notebook => 
      notebook.id === notebookData.type 
        ? { 
            ...notebook, 
            icon: notebookData.icon,
            color: `text-${notebookData.color}-600`
          }
        : notebook
    );
    // Save to localStorage
    localStorage.setItem('notebooks', JSON.stringify(updatedNotebooks));
    onUpdateNotebooks(updatedNotebooks);
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        const response = await fetch('/api/notes-log', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: noteId, 
            isPinned: !note.isPinned 
          })
        });
        if (response.ok) {
          onUpdateNotes(notes.map(n => 
            n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
          ));
        }
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleToggleArchive = async (noteId: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        const response = await fetch('/api/notes-log', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: noteId, 
            isClosed: !note.isClosed 
          })
        });
        if (response.ok) {
          onUpdateNotes(notes.map(n => 
            n.id === noteId ? { ...n, isClosed: !n.isClosed } : n
          ));
        }
      }
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  };

  const handleToggleHidden = async (noteId: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (note) {
        const response = await fetch('/api/notes-log', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: noteId, 
            isHidden: !note.isHidden 
          })
        });
        if (response.ok) {
          onUpdateNotes(notes.map(n => 
            n.id === noteId ? { ...n, isHidden: !n.isHidden } : n
          ));
        }
      }
    } catch (error) {
      console.error('Error toggling hidden:', error);
    }
  };

  return (
    <TabsContent value="notes" className="space-y-6">
      <NotesGrid
        notes={notes}
        notebooks={notebooks}
        onEditNote={(note) => {
          // Handled by NotesGrid modal
        }}
        onDeleteNote={handleDeleteNote}
        onSaveNote={handleSaveNote}
        onCreateNotebook={() => {
          // TODO: Open notebook creator
        }}
        onEditNotebook={(notebook) => {
          // Handled by NotebookSelector modal
        }}
        onSaveNotebook={handleSaveNotebook}
        onDeleteNotebook={(notebookId) => {
          // TODO: Implement notebook deletion
        }}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        onToggleHidden={handleToggleHidden}
      />
    </TabsContent>
  );
}
