import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { getAllPosts } from '@/lib/posts';
import { CATEGORIES } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  const base = env.SITE_URL.replace(/\/$/, '');
  const newest = posts[0]?.date ?? new Date().toISOString().slice(0, 10);

  const home: MetadataRoute.Sitemap[number] = {
    url: `${base}/`,
    lastModified: newest,
    priority: 1.0,
  };

  const search: MetadataRoute.Sitemap[number] = {
    url: `${base}/search`,
    priority: 0.5,
  };

  const categories: MetadataRoute.Sitemap = CATEGORIES.filter((c) => c.id !== 'all').map((c) => ({
    url: `${base}/category/${c.id}`,
    priority: 0.7,
  }));

  const tagSet = new Set<string>();
  for (const post of posts) for (const tag of post.tags) tagSet.add(tag);
  const tags: MetadataRoute.Sitemap = [...tagSet].map((t) => ({
    url: `${base}/tag/${t}`,
    priority: 0.5,
  }));

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/posts/${post.slug}`,
    lastModified: post.date,
    priority: 0.8,
  }));

  return [home, search, ...categories, ...tags, ...postUrls];
}
