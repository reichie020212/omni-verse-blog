export { CATEGORIES, CATEGORY_IDS } from '../../content/categories';
export type { CategoryId } from '../../content/categories';

import { CATEGORIES } from '../../content/categories';

export function categoryById(id: string) {
  return CATEGORIES.find((c) => c.id === id);
}

export function isKnownCategory(id: string): boolean {
  return CATEGORIES.some((c) => c.id === id);
}
