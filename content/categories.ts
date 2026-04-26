export const CATEGORIES = [
  { id: 'all',         label: 'All posts'   },
  { id: 'tech',        label: 'Tech'        },
  { id: 'programming', label: 'Programming' },
  { id: 'celestial',   label: 'Celestial'   },
  { id: 'family',      label: 'Family'      },
  { id: 'travel',      label: 'Travel'      },
  { id: 'books',       label: 'Books'       },
  { id: 'food',        label: 'Food'        },
  { id: 'essays',      label: 'Essays'      },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id);
