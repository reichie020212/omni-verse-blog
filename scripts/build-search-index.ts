import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getAllPosts } from '../src/lib/posts';
import { buildSearchIndex } from '../src/lib/search-index';

async function main(): Promise<void> {
  const posts = await getAllPosts();
  const index = buildSearchIndex(posts);
  const outDir = path.join(process.cwd(), 'public');
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'search-index.json');
  await writeFile(outFile, JSON.stringify(index), 'utf8');
  console.log(`Wrote ${index.length} entries to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
