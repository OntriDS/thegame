import { NoteColor } from '@/types/enums';

/** Color class mapping for note cards using theme-aware classes */
export const NOTE_COLOR_CLASSES: Record<NoteColor, string> = {
  [NoteColor.WHITE]: 'bg-card border-border hover:bg-muted/50',
  [NoteColor.ORANGE]: 'bg-orange-50/50 border-orange-200 hover:bg-orange-100/50 dark:bg-orange-950/20 dark:border-orange-800/50 dark:hover:bg-orange-900/30',
  [NoteColor.PURPLE]: 'bg-purple-50/50 border-purple-200 hover:bg-purple-100/50 dark:bg-purple-950/20 dark:border-purple-800/50 dark:hover:bg-purple-900/30',
  [NoteColor.GREEN]: 'bg-green-50/50 border-green-200 hover:bg-green-100/50 dark:bg-green-950/20 dark:border-green-800/50 dark:hover:bg-green-900/30',
  [NoteColor.BLUE]: 'bg-blue-50/50 border-blue-200 hover:bg-blue-100/50 dark:bg-blue-950/20 dark:border-blue-800/50 dark:hover:bg-blue-900/30',
  [NoteColor.YELLOW]: 'bg-yellow-50/50 border-yellow-200 hover:bg-yellow-100/50 dark:bg-yellow-950/20 dark:border-yellow-800/50 dark:hover:bg-yellow-900/30',
  [NoteColor.PINK]: 'bg-pink-50/50 border-pink-200 hover:bg-pink-100/50 dark:bg-pink-950/20 dark:border-pink-800/50 dark:hover:bg-pink-900/30',
  [NoteColor.RED]: 'bg-red-50/50 border-red-200 hover:bg-red-100/50 dark:bg-red-950/20 dark:border-red-800/50 dark:hover:bg-red-900/30',
  [NoteColor.GRAY]: 'bg-muted/30 border-border hover:bg-muted/50'
};

/** Get color classes for a note */
export function getNoteColorClasses(color: string): string {
  return NOTE_COLOR_CLASSES[color as NoteColor] || NOTE_COLOR_CLASSES[NoteColor.WHITE];
}

/** Get color label for display */
export function getColorLabel(color: string): string {
  const colorLabels: Record<NoteColor, string> = {
    [NoteColor.WHITE]: 'White',
    [NoteColor.ORANGE]: 'Orange',
    [NoteColor.PURPLE]: 'Purple',
    [NoteColor.GREEN]: 'Green',
    [NoteColor.BLUE]: 'Blue',
    [NoteColor.YELLOW]: 'Yellow',
    [NoteColor.PINK]: 'Pink',
    [NoteColor.RED]: 'Red',
    [NoteColor.GRAY]: 'Gray'
  };
  return colorLabels[color as NoteColor] || 'White';
}
