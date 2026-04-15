// lib/constants/notes-taxonomy-labels.ts
import { NotebookType, NoteColor } from '@/types/enums';

const toTitle = (slug: string): string =>
  slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

export const NOTEBOOK_TYPE_LABEL: Record<NotebookType, string> = {
  [NotebookType.ALL_NOTES]: 'All Notes',
  [NotebookType.CURRENT_SPRINT]: 'Current Sprint',
  [NotebookType.CHALLENGES]: 'Challenges',
  [NotebookType.ROAD_AHEAD]: 'Road Ahead',
  [NotebookType.STRATEGY]: 'Strategy',
  [NotebookType.IDEAS]: 'Ideas',
  [NotebookType.GENERAL]: 'General',
};

export const NOTE_COLOR_LABEL: Record<NoteColor, string> = {
  [NoteColor.WHITE]: 'White',
  [NoteColor.ORANGE]: 'Orange',
  [NoteColor.PURPLE]: 'Purple',
  [NoteColor.GREEN]: 'Green',
  [NoteColor.BLUE]: 'Blue',
  [NoteColor.YELLOW]: 'Yellow',
  [NoteColor.PINK]: 'Pink',
  [NoteColor.RED]: 'Red',
  [NoteColor.GRAY]: 'Gray',
};

export function getNotebookTypeLabel(
  value: NotebookType | string | undefined | null
): string {
  if (!value) return '';
  if (value in NOTEBOOK_TYPE_LABEL) {
    return NOTEBOOK_TYPE_LABEL[value as NotebookType];
  }
  return toTitle(String(value));
}

export function getNoteColorLabel(value: NoteColor | string | undefined | null): string {
  if (!value) return '';
  if (value in NOTE_COLOR_LABEL) {
    return NOTE_COLOR_LABEL[value as NoteColor];
  }
  return toTitle(String(value));
}
