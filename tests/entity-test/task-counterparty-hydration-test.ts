import { describe, expect, it } from 'vitest';
import { getLinkedCharacterSelection } from '@/lib/utils/entity-link-selectors';

describe('task counterparty field hydration', () => {
  it('hydrates the beneficiary selector from the canonical TASK_CHARACTER link', () => {
    const selection = getLinkedCharacterSelection([
      {
        linkType: 'TASK_CHARACTER',
        relationship: 'owner',
        target: { type: 'character', id: 'owner-1' },
      },
      {
        linkType: 'TASK_CHARACTER',
        relationship: 'beneficiary',
        target: { type: 'character', id: 'beneficiary-1' },
      },
    ], 'TASK_CHARACTER');

    expect(selection).toEqual({ id: 'beneficiary-1', role: 'beneficiary' });
  });

  it('ignores owner and unrelated links when resolving the selector', () => {
    const selection = getLinkedCharacterSelection([
      {
        linkType: 'TASK_CHARACTER',
        relationship: 'owner',
        target: { type: 'character', id: 'owner-1' },
      },
      {
        linkType: 'TASK_SITE',
        relationship: 'performed-at',
        target: { type: 'site', id: 'site-1' },
      },
    ], 'TASK_CHARACTER');

    expect(selection).toBeNull();
  });
});
