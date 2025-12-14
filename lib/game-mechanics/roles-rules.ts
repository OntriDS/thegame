// lib/game-mechanics/roles-rules.ts
// Role Behavior Rules - Game Mechanics for Character Roles

import { CharacterRole } from '@/types/enums';

/**
 * Role Behavior Configuration
 * Defines special handling for each special role in the game
 * 
 * Rules:
 * - isImmutable: Cannot be removed once assigned
 * - hideIfNotAssigned: Don't show option if not already assigned
 * - isDisplayOnly: Cannot be toggled (read-only)
 * - requiresJungleCoins: Only show if character has J$
 * 
 * V0.2 Role Benefits:
 * - PLAYER: Allows character to be a Player Character entity with points progression
 * - CUSTOMER: Opens purchase tracking & customer analytics
 * - Business Roles + PLAYER: Can complete station tasks
 * - Business Roles ONLY: External contractor (no TheCompany benefits)
 * - FOUNDER: Full system access, immutable role
 * - INVESTOR: Investment tracking & returns, immutable role
 */
export const ROLE_BEHAVIORS = {
  [CharacterRole.FOUNDER]: {
    isImmutable: true,        // Cannot be removed once assigned
    hideIfNotAssigned: true,  // Don't show option if not already assigned
    isDisplayOnly: true,      // Cannot be toggled
    requiresJungleCoins: false,
  },
  [CharacterRole.PLAYER]: {
    isImmutable: false,
    hideIfNotAssigned: false,
    isDisplayOnly: true,      // Based on character-player link
    requiresJungleCoins: false,
  },
  [CharacterRole.INVESTOR]: {
    isImmutable: true,        // Cannot be removed once assigned
    hideIfNotAssigned: true,  // Only show if character has J$
    requiresJungleCoins: true, // Special condition: needs J$ to appear
    isDisplayOnly: true,      // Cannot be toggled when assigned
  },
  [CharacterRole.PADAWAN]: {
    isImmutable: false,
    hideIfNotAssigned: false,
    isDisplayOnly: false,     // Can be freely toggled
    requiresJungleCoins: false,
  },
  [CharacterRole.TEAM]: {
    isImmutable: false,
    hideIfNotAssigned: false,
    isDisplayOnly: false,     // Can be freely toggled
    requiresJungleCoins: false,
  },
  [CharacterRole.FAMILY]: {
    isImmutable: false,
    hideIfNotAssigned: false,
    isDisplayOnly: false,     // Can be freely toggled
    requiresJungleCoins: false,
  },
  [CharacterRole.BOSS]: {
    isImmutable: false,
    hideIfNotAssigned: false,
    isDisplayOnly: false,     // Can be freely toggled
    requiresJungleCoins: false,
  },
  [CharacterRole.PARTNER]: {
    isImmutable: false,
    hideIfNotAssigned: false,
    isDisplayOnly: false,     // Can be freely toggled
    requiresJungleCoins: false,
  }
} as const;

/**
 * Role Benefits Configuration (V0.2)
 * Defines what each role enables in the system
 */
export const ROLE_BENEFITS = {
  [CharacterRole.PARTNER]: {
    description: "Strategic partner with business shares",
    benefits: [
      "Can hold shares in a specific Business",
      "Can have multiple Contracts assigned",
      "Shareholder analytics",
    ],
    requirements: ["Must have valid Business link"]
  },
  [CharacterRole.PLAYER]: {
    description: "Connects the character to a Player entity with points progression",
    benefits: [
      "Can earn points (HP, FP, RP, XP) and exchange them for J$ or Zap$",
      "Can exchange J$ and Zap$ for USD or Bitcoin",
      "Can create characters and unlock achievements",
      "Access to the player progression system",
      "Cant modify character data from Character Modal" //Must use Player Modal -> Account Submodal
    ],
    requirements: ["Must be linked to a Player entity"]
  },
  [CharacterRole.FOUNDER]: {
    description: "Full system access, immutable role of first player",
    benefits: [
      "Full system access and modifications",
      "Can manage (CRUD) all entities and their data",
      "Immutable role (cannot be removed or changed at the moment)",
      "For Player One as main player login account, should have character linked",
      "Can Hide his character from the public view",
      "Can grant access to other Players and other Special Roles",
      "Can manage in-game currency, points and game-mechanics",
      "Can view Account entity details from Character Modal"
    ],
    requirements: ["Must be Player One"]
  },
  [CharacterRole.CUSTOMER]: {
    description: "Opens purchase tracking & customer analytics",
    benefits: [
      "Purchase history tracking and Customer analytics",
      "Unlock customer achievements and gets customer points",
      "Gets a character in TheGame with custom relationships, perks and data management",
      // "Can login to the customer portal", // In Ideation
      "Open a J$ In-game wallet" // Zaps-BJ wallet is in Ideation
    ],
    requirements: ["Make a purchase or get Created by Founder or Team Roles"]
  },
  [CharacterRole.INVESTOR]: {
    description: "Has In-game J$ and Zaps Holdings.",
    benefits: [
      "In-game J$ and Zaps assets tracking",
      "Can trade J$ and Zaps for USD or Bitcoin",
      "Return calculations and analytics",
      "Immutable role (cannot be removed)",
      "Unlocks great customer achievements and rewards",
      "Requirement for non team roles to have player beta access"
      // "Can login to the TheGame platform and have a player, and to the portal.space" // In Ideation
    ],
    requirements: ["Character must have J$ or Zaps", "J$ or Zaps balance must be greater than 1 J$"]
  },
  [CharacterRole.FAMILY]: {
    description: "Family members can have characters to track tasks and financials related data",
    benefits: [
      "Internal calculations and analytics",
      "will be consider a more special character by the system", // by agents
      "could have login account connected to founder account",
      "Unlocks the Unique Family achievement (once get, achievement cant be removed)",
      "Immutable role (cannot be removed) in the Character Modal"
      // "Can login to the portal.space and interact with character", // In Ideation
    ],
    requirements: ["Only Founder can grant this role"]
  },
  [CharacterRole.BOSS]: {
    description: "Boss role for business ownership and leadership",
    benefits: [
      "Can own and manage businesses",
      "Leadership tracking and analytics",
      "Can grant special permissions to team members",
      "Access to business management features"
    ],
    requirements: ["Only Founder can grant this role"]
  },
  [CharacterRole.TEAM]: {
    description: "Team member of the business of the user",
    benefits: [
      "Can perform tasks and operations related to the business",
      "will be consider a more special character by the system", // by agents
      "could have login account connected to founder account",
      "Immutable role (cannot be removed) in the Character Modal"
      // "Can login to the portal.space and interact with character", // In Ideation
    ],
    requirements: ["Only Founder can grant this role"]
  },
  [CharacterRole.PADAWAN]: {
    description: "Padawan will grant special benefits",
    benefits: [
      "Secret achivement with Perks and Missions for the character",
      "Will be consider a more special character by the system", // by agents
      "Must have login account connected to founder account",
      "Unlocks the Unique Padawan achievement (once get, achievement cant be removed)",
      "Immutable role (cannot be removed) in the Character Modal"
      // "Can login to the portal.space and interact with character", // In Ideation
    ],
    requirements: ["Only Founder can grant this role"]
  }
} as const;

/**
 * Business Roles Configuration
 * Defines business roles and their capabilities
 */
export const BUSINESS_ROLES = [
  CharacterRole.ADMIN,
  CharacterRole.DESIGNER,
  CharacterRole.PRODUCER,
  CharacterRole.SELLER,
  CharacterRole.RESEARCHER,
  CharacterRole.DEVELOPER,
  CharacterRole.TEAM,
  CharacterRole.AI_AGENT,
  CharacterRole.ASSOCIATE,
  CharacterRole.COLLABORATOR
] as const;

/**
 * Check if a character can complete station tasks
 * Business Roles + PLAYER = can complete station tasks
 */
export function canCompleteStationTasks(characterRoles: CharacterRole[]): boolean {
  const hasPlayerRole = characterRoles.includes(CharacterRole.PLAYER);
  const hasBusinessRole = characterRoles.some(role => BUSINESS_ROLES.includes(role as any));

  return hasPlayerRole && hasBusinessRole;
}

/**
 * Check if a character is an external contractor
 * Business Roles ONLY (without PLAYER) = external contractor
 */
export function isExternalContractor(characterRoles: CharacterRole[]): boolean {
  const hasPlayerRole = characterRoles.includes(CharacterRole.PLAYER);
  const hasBusinessRole = characterRoles.some(role => BUSINESS_ROLES.includes(role as any));

  return hasBusinessRole && !hasPlayerRole;
}

/**
 * Get role benefits for a character
 */
export function getRoleBenefits(characterRoles: CharacterRole[]): string[] {
  const benefits: string[] = [];

  characterRoles.forEach(role => {
    const roleBenefit = ROLE_BENEFITS[role as keyof typeof ROLE_BENEFITS];
    if (roleBenefit) {
      benefits.push(...roleBenefit.benefits);
    }
  });

  // Add conditional benefits
  if (canCompleteStationTasks(characterRoles)) {
    benefits.push("Can complete station tasks (Business Role + PLAYER)");
  }

  if (isExternalContractor(characterRoles)) {
    benefits.push("External contractor (no TheCompany benefits)");
  }

  return [...new Set(benefits)]; // Remove duplicates
}

/**
 * Check if character can view Account information
 * Only FOUNDER and ADMIN roles can view Account entity details
 */
export function canViewAccountInfo(characterRoles: CharacterRole[]): boolean {
  return characterRoles.includes(CharacterRole.FOUNDER) ||
    characterRoles.includes(CharacterRole.ADMIN);
}

