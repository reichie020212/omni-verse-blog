'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function PostDrawer({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, [slug]);

  function close() {
    ref.current?.close();
    router.back();
  }

  return (
    <dialog
      ref={ref}
      className="post-drawer"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <button
        type="button"
        className="drawer-close"
        onClick={close}
        aria-label="Close article"
      >
        ×
      </button>
      <div className="drawer-content">{children}</div>
    </dialog>
  );
}
