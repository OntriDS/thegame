// lib/constants/player-taxonomy-labels.ts
import {
  PointType,
  CognitiveSkill,
  EmotionalSkill,
  PracticalSkill,
  CommColor,
} from '@/types/enums';

const toTitle = (slug: string): string =>
  slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

export const POINT_TYPE_LABEL: Record<PointType, string> = {
  [PointType.XP]: 'XP',
  [PointType.RP]: 'RP',
  [PointType.FP]: 'FP',
  [PointType.HP]: 'HP',
};

export const COGNITIVE_SKILL_LABEL: Record<CognitiveSkill, string> = {
  [CognitiveSkill.LOGIC]: 'Logic',
  [CognitiveSkill.PERCEPTION]: 'Perception',
  [CognitiveSkill.VISION]: 'Vision',
  [CognitiveSkill.WISDOM]: 'Wisdom',
  [CognitiveSkill.DECISION_MAKING]: 'Decision Making',
  [CognitiveSkill.CREATIVITY]: 'Creativity',
  [CognitiveSkill.PROBLEM_SOLVING]: 'Problem Solving',
  [CognitiveSkill.MEMORY]: 'Memory',
  [CognitiveSkill.PLANNING]: 'Planning',
  [CognitiveSkill.ORGANIZATION]: 'Organization',
  [CognitiveSkill.TIME_MNGM]: 'Time Management',
  [CognitiveSkill.CONCENTRATION]: 'Concentration',
};

export const EMOTIONAL_SKILL_LABEL: Record<EmotionalSkill, string> = {
  [EmotionalSkill.SELF_AWARE]: 'Self Awareness',
  [EmotionalSkill.EMOTION_CONTROL]: 'Emotion Control',
  [EmotionalSkill.SELF_CONTROL]: 'Self Control',
  [EmotionalSkill.DETERMINATION]: 'Determination',
  [EmotionalSkill.INITIATIVE]: 'Initiative',
  [EmotionalSkill.RESILIENCE]: 'Resilience',
  [EmotionalSkill.EMPATHY]: 'Empathy',
  [EmotionalSkill.INTEGRITY]: 'Integrity',
  [EmotionalSkill.CHARISMA]: 'Charisma',
  [EmotionalSkill.LEADERSHIP]: 'Leadership',
  [EmotionalSkill.COMMUNICATION]: 'Communication',
};

export const PRACTICAL_SKILL_LABEL: Record<PracticalSkill, string> = {
  [PracticalSkill.FITNESS]: 'Fitness',
  [PracticalSkill.DESIGN_THINKING]: 'Design Thinking',
  [PracticalSkill.PROJECT_MANAGEMENT]: 'Project Management',
  [PracticalSkill.TEACHING]: 'Teaching',
  [PracticalSkill.NEGOTIATION]: 'Negotiation',
  [PracticalSkill.NARRATIVE]: 'Narrative',
  [PracticalSkill.DEVELOPING]: 'Developing',
  [PracticalSkill.HANDCRAFTING]: 'Handcrafting',
  [PracticalSkill.PAINTING]: 'Painting',
  [PracticalSkill.ILLUSTRATION]: 'Illustration',
};

export const COMM_COLOR_LABEL: Record<CommColor, string> = {
  [CommColor.RED]: 'Red',
  [CommColor.YELLOW]: 'Yellow',
  [CommColor.GREEN]: 'Green',
  [CommColor.BLUE]: 'Blue',
  [CommColor.PURPLE]: 'Purple',
  [CommColor.ORANGE]: 'Orange',
  [CommColor.TURQUOISE]: 'Turquoise',
  [CommColor.BROWN]: 'Brown',
  [CommColor.YELLOW_BLUE]: 'Yellow-Blue',
  [CommColor.YELLOW_GREEN]: 'Yellow-Green',
};

export function getPointTypeLabel(type: PointType | string | undefined | null): string {
  if (!type) return '';
  if (type in POINT_TYPE_LABEL) return POINT_TYPE_LABEL[type as PointType];
  return toTitle(String(type));
}

export function getCognitiveSkillLabel(
  value: CognitiveSkill | string | undefined | null
): string {
  if (!value) return '';
  if (value in COGNITIVE_SKILL_LABEL) {
    return COGNITIVE_SKILL_LABEL[value as CognitiveSkill];
  }
  return toTitle(String(value));
}

export function getEmotionalSkillLabel(value: EmotionalSkill | string | undefined | null): string {
  if (!value) return '';
  if (value in EMOTIONAL_SKILL_LABEL) {
    return EMOTIONAL_SKILL_LABEL[value as EmotionalSkill];
  }
  return toTitle(String(value));
}

export function getPracticalSkillLabel(value: PracticalSkill | string | undefined | null): string {
  if (!value) return '';
  if (value in PRACTICAL_SKILL_LABEL) {
    return PRACTICAL_SKILL_LABEL[value as PracticalSkill];
  }
  return toTitle(String(value));
}

export function getCommColorLabel(value: CommColor | string | undefined | null): string {
  if (!value) return '';
  if (value in COMM_COLOR_LABEL) {
    return COMM_COLOR_LABEL[value as CommColor];
  }
  return toTitle(String(value));
}
