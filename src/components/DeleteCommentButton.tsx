'use client';

import { useTransition } from 'react';
import { deleteComment } from '@/lib/comments-actions';
import { useToast } from './ToastProvider';

export function DeleteCommentButton({ id, slug }: { id: string; slug: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  function onClick() {
    if (!confirm('Delete this comment?')) return;
    const fd = new FormData();
    fd.set('id', id);
    fd.set('slug', slug);
    startTransition(async () => {
      try {
        await deleteComment(fd);
        toast.show('Comment deleted');
      } catch {
        toast.show('Could not delete');
      }
    });
  }
  return (
    <button
      type="button"
      className="comment-delete"
      onClick={onClick}
      disabled={pending}
      aria-label="Delete comment"
    >
      delete
    </button>
  );
}
