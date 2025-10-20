'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Pin, 
  Tag,
  Calendar,
  EyeOff,
  Archive
} from 'lucide-react';
import { Note } from '@/types/entities';
import { formatDateDDMMYYYY } from '@/lib/constants/date-constants';
import { parseRichText, getNotePreview } from '@/lib/utils/rich-text-utils';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onTogglePin?: (noteId: string) => void;
  onToggleArchive?: (noteId: string) => void;
  onToggleHidden?: (noteId: string) => void;
}

export function NoteCard({ 
  note, 
  onEdit,
  onTogglePin,
  onToggleArchive,
  onToggleHidden
}: NoteCardProps) {

  return (
    <Card
      className={`bg-card border-border hover:bg-muted/50 transition-all duration-200 hover:shadow-md cursor-pointer group ${
        note.isHidden ? 'opacity-60 blur-sm' : ''
      }`}
      onClick={() => onEdit(note)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{note.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatDateDDMMYYYY(new Date(note.updatedAt))}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {note.isPinned && (
              <Pin className="h-3 w-3 text-yellow-600 fill-current" />
            )}
            {note.isHidden && (
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground line-clamp-4">
            {parseRichText(note.content)}
          </div>
          
          {/* Status badges */}
          <div className="flex items-center gap-2">
            {note.isClosed && (
              <Badge variant="outline" className="text-xs">
                Closed
              </Badge>
            )}
            {note.isHidden && (
              <Badge variant="outline" className="text-xs">
                Hidden
              </Badge>
            )}
          </div>
          
          {/* Tags at the bottom */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {note.tags.slice(0, 4).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-1.5 py-0.5"
                >
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 4 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  +{note.tags.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1">
              {onTogglePin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note.id);
                  }}
                  className={`p-1 rounded hover:bg-muted transition-colors ${
                    note.isPinned ? 'text-yellow-600' : 'text-muted-foreground'
                  }`}
                  title={note.isPinned ? 'Unpin note' : 'Pin note'}
                >
                  <Pin className="h-3 w-3" />
                </button>
              )}
              {onToggleArchive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleArchive(note.id);
                  }}
                  className={`p-1 rounded hover:bg-muted transition-colors ${
                    note.isClosed ? 'text-orange-600' : 'text-muted-foreground'
                  }`}
                  title={note.isClosed ? 'Reopen note' : 'Close note'}
                >
                  <Archive className="h-3 w-3" />
                </button>
              )}
              {onToggleHidden && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleHidden(note.id);
                  }}
                  className={`p-1 rounded hover:bg-muted transition-colors ${
                    note.isHidden ? 'text-red-600' : 'text-muted-foreground'
                  }`}
                  title={note.isHidden ? 'Show note' : 'Hide note'}
                >
                  <EyeOff className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
