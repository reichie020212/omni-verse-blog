import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';

export default function NotFound() {
  return (
    <div className="layout-with-sidebar">
      <Sidebar />
      <section className="not-found">
        <h1>Page not found</h1>
        <p>The page you’re looking for isn’t here. Maybe it never was.</p>
        <p>
          <Link href="/">← Back to all posts</Link>
        </p>
      </section>
    </div>
  );
}
