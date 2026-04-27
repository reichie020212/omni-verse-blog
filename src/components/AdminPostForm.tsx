import Link from 'next/link';
import { upsertPostAction } from '@/lib/posts-admin-actions';
import { CATEGORY_IDS } from '@/lib/categories';
import type { Post } from '@/lib/posts';

const SIZES = ['hero', 'wide', 'medium', 'small'] as const;
const FIELD = { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem' };
const INPUT = {
  padding: '0.5rem',
  fontFamily: 'inherit',
  fontSize: '1rem',
  background: '#111',
  color: '#eee',
  border: '1px solid #333',
  borderRadius: '4px',
};

export function AdminPostForm({ initial }: { initial?: Post }) {
  return (
    <form
      action={upsertPostAction}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '720px' }}
    >
      <label style={FIELD}>
        <span>Title</span>
        <input type="text" name="title" defaultValue={initial?.title ?? ''} required style={INPUT} />
      </label>
      <label style={FIELD}>
        <span>Slug (kebab-case; cannot change after creation)</span>
        <input
          type="text"
          name="slug"
          defaultValue={initial?.slug ?? ''}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
          readOnly={!!initial}
          style={INPUT}
        />
      </label>
      <label style={FIELD}>
        <span>Excerpt</span>
        <textarea name="excerpt" defaultValue={initial?.excerpt ?? ''} required rows={2} style={INPUT} />
      </label>
      <label style={FIELD}>
        <span>Body (MDX)</span>
        <textarea name="body" defaultValue={initial?.body ?? ''} required rows={20} style={INPUT} />
      </label>
      <label style={FIELD}>
        <span>Category</span>
        <select name="category" defaultValue={initial?.category ?? CATEGORY_IDS[0]} required style={INPUT}>
          {CATEGORY_IDS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label style={FIELD}>
        <span>Tags (comma-separated)</span>
        <input
          type="text"
          name="tags"
          defaultValue={initial?.tags?.join(', ') ?? ''}
          style={INPUT}
        />
      </label>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <label style={{ ...FIELD, flex: 1 }}>
          <span>Date</span>
          <input
            type="date"
            name="date"
            defaultValue={initial?.date ?? new Date().toISOString().slice(0, 10)}
            required
            style={INPUT}
          />
        </label>
        <label style={{ ...FIELD, flex: 1 }}>
          <span>Read time (min)</span>
          <input
            type="number"
            name="readTime"
            defaultValue={initial?.readTime ?? 5}
            min={1}
            required
            style={INPUT}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <label style={{ ...FIELD, flex: 1 }}>
          <span>Card size</span>
          <select name="size" defaultValue={initial?.size ?? 'medium'} required style={INPUT}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label style={{ ...FIELD, flex: 1 }}>
          <span>Cover (SVG generator name or JPG path)</span>
          <input type="text" name="cover" defaultValue={initial?.cover ?? ''} required style={INPUT} />
        </label>
      </div>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="checkbox" name="featured" defaultChecked={initial?.featured ?? false} />
        <span>Featured</span>
      </label>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input type="checkbox" name="draft" defaultChecked={initial?.draft ?? true} />
        <span>Draft (hidden from public site)</span>
      </label>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button type="submit" style={{ ...INPUT, cursor: 'pointer' }}>
          {initial ? 'Save changes' : 'Create post'}
        </button>
        <Link href="/admin/posts" style={{ alignSelf: 'center' }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
