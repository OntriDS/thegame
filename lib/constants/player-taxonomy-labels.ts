// lib/constants/player-taxonomy-labels.ts
import {
  PointType,
  IntelectualFunction,
  Attribute,
  Skill,
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

export const INTELECTUAL_FUNCTION_LABEL: Record<IntelectualFunction, string> = {
  [IntelectualFunction.SELF_AWARE]: 'Self Awareness',
  [IntelectualFunction.EMOTION_CONTROL]: 'Emotion Control',
  [IntelectualFunction.DECISION_MAKING]: 'Decision Making',
  [IntelectualFunction.CREATIVITY]: 'Creativity',
  [IntelectualFunction.PROBLEM_SOLVING]: 'Problem Solving',
  [IntelectualFunction.SELF_CONTROL]: 'Self Control',
  [IntelectualFunction.WORK_MEMORY]: 'Working Memory',
  [IntelectualFunction.ADAPTABILITY]: 'Adaptability',
  [IntelectualFunction.INITIATIVE]: 'Initiative',
  [IntelectualFunction.PLANNING]: 'Planning',
  [IntelectualFunction.ORGANIZATION]: 'Organization',
  [IntelectualFunction.TIME_MNGM]: 'Time Management',
  [IntelectualFunction.CONCENTRATION]: 'Concentration',
  [IntelectualFunction.DETERMINATION]: 'Determination',
};

export const ATTRIBUTE_LABEL: Record<Attribute, string> = {
  [Attribute.PERCEPTION]: 'Perception',
  [Attribute.LOGIC]: 'Logic',
  [Attribute.FITNESS]: 'Fitness',
  [Attribute.CHARISMA]: 'Charisma',
  [Attribute.WISDOM]: 'Wisdom',
  [Attribute.LEADERSHIP]: 'Leadership',
  [Attribute.COMMUNICATION]: 'Communication',
  [Attribute.VISION]: 'Vision',
  [Attribute.RESILIENCE]: 'Resilience',
  [Attribute.EMPATHY]: 'Empathy',
  [Attribute.INTEGRITY]: 'Integrity',
};

export const SKILL_LABEL: Record<Skill, string> = {
  [Skill.DESIGN_THINKING]: 'Design Thinking',
  [Skill.PROJECT_MANAGEMENT]: 'Project Management',
  [Skill.TEACHING]: 'Teaching',
  [Skill.NEGOTIATION]: 'Negotiation',
  [Skill.NARRATIVE]: 'Narrative',
  [Skill.DEVELOPING]: 'Developing',
  [Skill.HANDCRAFTING]: 'Handcrafting',
  [Skill.PAINTING]: 'Painting',
  [Skill.ILLUSTRATION]: 'Illustration',
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

export function getIntelectualFunctionLabel(
  value: IntelectualFunction | string | undefined | null
): string {
  if (!value) return '';
  if (value in INTELECTUAL_FUNCTION_LABEL) {
    return INTELECTUAL_FUNCTION_LABEL[value as IntelectualFunction];
  }
  return toTitle(String(value));
}

export function getAttributeLabel(value: Attribute | string | undefined | null): string {
  if (!value) return '';
  if (value in ATTRIBUTE_LABEL) {
    return ATTRIBUTE_LABEL[value as Attribute];
  }
  return toTitle(String(value));
}

export function getSkillLabel(value: Skill | string | undefined | null): string {
  if (!value) return '';
  if (value in SKILL_LABEL) {
    return SKILL_LABEL[value as Skill];
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
