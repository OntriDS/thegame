import { Collection } from '@/types/enums';

export const COLLECTION_LABEL: Record<Collection, string> = {
  [Collection.NO_COLLECTION]: 'No Collection',
  [Collection.ORGANIC_IMAGINARY]: 'Organic Imaginary',
  [Collection.ANIMAL_KINGDOM]: 'Animal Kingdom',
  [Collection.MUSHLAND]: 'Mushland',
  [Collection.SEVEN_ELEMENTS]: 'Seven Elements',
  [Collection.BITCOIN]: 'Bitcoin',
  [Collection.DOPE_CREW]: 'Dope Crew',
  [Collection.WORDS]: 'Words',
  [Collection.FRUITS_VEGGIES]: 'Fruits & Veggies',
  [Collection.FLOWERS]: 'Flowers',
  [Collection.KINGS_QUEENS]: 'Kings & Queens',
  [Collection.POLYGONAL_HD]: 'Polygonal HD',
  [Collection.RELIQUIAS]: 'Reliquias',
  [Collection.BITUAYA]: 'Bituaya',
  [Collection.LANDSCAPES]: 'Landscapes',
  [Collection.EXILIADO]: 'Exiliado',
  [Collection.CLIENT_WORK]: 'Client Work',
};

export function getCollectionLabel(value: Collection | string | undefined | null): string {
  if (!value || value === 'none' || value === 'null' || value === 'undefined') return 'No Collection';
  if (value in COLLECTION_LABEL) return COLLECTION_LABEL[value as Collection];
  return String(value);
}

export function normalizeCollectionValue(
  value: string | undefined | null
): Collection | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (Object.values(Collection).includes(trimmed as Collection)) {
    return trimmed as Collection;
  }

  const normalizedInput = trimmed.toLowerCase();
  const match = Object.entries(COLLECTION_LABEL).find(
    ([_, label]) => label.toLowerCase() === normalizedInput
  );
  if (match) {
    return match[0] as Collection;
  }

  return undefined;
}
