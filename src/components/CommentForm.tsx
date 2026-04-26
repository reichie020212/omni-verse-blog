'use client';

import { useRef, useTransition } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { addComment } from '@/lib/comments-actions';
import { useToast } from './ToastProvider';

export function CommentForm({ slug }: { slug: string }) {
  const session = useSession();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (session.status !== 'authenticated') {
    return (
      <div className="comment-form-cta">
        <p>
          <Link href={`/signin?next=${encodeURIComponent(`/posts/${slug}`)}`}>
            Sign in to comment
          </Link>
        </p>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set('slug', slug);
    startTransition(async () => {
      try {
        await addComment(fd);
        form.reset();
        toast.show('Comment posted');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not post comment';
        toast.show(msg);
      }
    });
  }

  return (
    <form className="comment-form" ref={formRef} onSubmit={onSubmit}>
      <label htmlFor="comment-body" className="visually-hidden">
        Your comment
      </label>
      <textarea
        id="comment-body"
        name="body"
        rows={4}
        placeholder="Add a comment… **bold** *italic* `code` [text](https://example.com)"
        required
        maxLength={4000}
      />
      <div className="comment-form-actions">
        <p className="comment-form-help">
          markdown subset: <code>**bold**</code>, <code>*italic*</code>,{' '}
          <code>`code`</code>, <code>[link](url)</code>
        </p>
        <button type="submit" disabled={pending}>
          {pending ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}
