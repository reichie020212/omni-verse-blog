import type { Post } from './posts';

export function rankRelated(current: Post, all: Post[], limit = 3): Post[] {
  return all
    .filter((p) => p.slug !== current.slug && !p.draft)
    .map((p) => {
      const tagOverlap = p.tags.filter((t) => current.tags.includes(t)).length;
      const sameCategory = p.category === current.category ? 1 : 0;
      const score = tagOverlap * 2 + sameCategory;
      return { post: p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map(({ post }) => post);
}
