import { AdminPostForm } from '@/components/AdminPostForm';

export const dynamic = 'force-dynamic';

export default function AdminPostNewPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <h1>New post</h1>
      <AdminPostForm />
    </main>
  );
}
