// types/jungle-academy.ts

export type SchoolClassType = 'spanish' | 'art';

export interface JungleStudent {
  id: string;
  name: string;
  pointsSpa: number;
  pointsArt: number;
  totalPoints: number;
}

export interface JungleClassEvent {
  id: string;
  studentId: string;
  className: SchoolClassType;
  event: string;
  date: string; // UtcIsoString
  points: number;
}

// Group IDs
export type JungleGroupId = 'eep' | 'group-a' | 'group-b' | 'group-c';
