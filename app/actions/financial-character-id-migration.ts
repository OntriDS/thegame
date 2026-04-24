'use server';

export async function migrateFinancialRecordCharacterId(dryRun: boolean = true) {
  try {
    if (!dryRun) {
      console.warn('[FINREC_MIGRATION_RETIRED] financial-character-id migration is no longer needed.');
    }
    return {
      success: true,
      totalCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      message: dryRun
        ? 'Financial migration is retired in this phase.'
        : 'Financial migration is retired in this phase.',
    };
  } catch (error) {
    console.error('[MIGRATION_ERROR]', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Critical error during financial migration.',
    };
  }
}

