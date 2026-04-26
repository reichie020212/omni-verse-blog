import { Sidebar } from '@/components/Sidebar';
import { getAllPosts } from '@/lib/posts';
import { FilteredGrid } from '@/components/FilteredGrid';

export default async function HomePage() {
  const posts = await getAllPosts();
  return (
    <div className="layout-with-sidebar">
      <Sidebar />
      <FilteredGrid posts={posts} />
    </div>
  );
}
