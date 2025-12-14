import { LegalEntity } from '@/types/entities';
import { LegalEntityType } from '@/types/enums';

/**
 * Creates legal entity options for SearchableSelect components
 * @param entities Array of LegalEntity objects
 * @returns Array of options with proper categories
 */
export const createLegalEntityOptionsWithCategories = (entities: LegalEntity[]): Array<{ value: string; label: string; category?: string }> => {
    // Define a robust sort order for categories
    const groupOrder: Record<string, number> = {
        [LegalEntityType.INDIVIDUAL]: 0,
        [LegalEntityType.COMPANY]: 1,
        [LegalEntityType.DAO]: 2,
        [LegalEntityType.NON_PROFIT]: 3
    };

    // Sort entities by Type first, then Name
    const sortedEntities = [...entities].sort((a, b) => {
        const aType = a.type || 'Other';
        const bType = b.type || 'Other';

        const aIdx = groupOrder[aType] ?? 99;
        const bIdx = groupOrder[bType] ?? 99;

        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.name.localeCompare(b.name);
    });

    return sortedEntities.map(entity => ({
        value: entity.id,
        label: entity.name,
        category: entity.type || 'Other'
    }));
};
