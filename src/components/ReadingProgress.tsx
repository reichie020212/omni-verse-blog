'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function getScroller(): HTMLElement | Window {
  if (typeof document === 'undefined') return window;
  const drawer = document.querySelector<HTMLDialogElement>('dialog.post-drawer[open]');
  return drawer ?? window;
}

function readProgress(scroller: HTMLElement | Window): number {
  if (scroller instanceof Window) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, window.scrollY / max) : 0;
  }
  const max = scroller.scrollHeight - scroller.clientHeight;
  return max > 0 ? Math.min(1, scroller.scrollTop / max) : 0;
}

export function ReadingProgress() {
  const pathname = usePathname();
  const isPost = pathname?.startsWith('/posts/') ?? false;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPost) {
      setProgress(0);
      return;
    }
    let scroller = getScroller();
    function update() {
      setProgress(readProgress(scroller));
    }
    function rebind() {
      scroller.removeEventListener?.('scroll', update);
      scroller = getScroller();
      scroller.addEventListener?.('scroll', update, { passive: true } as AddEventListenerOptions);
      update();
    }
    rebind();
    window.addEventListener('resize', update);
    const obs = new MutationObserver(rebind);
    obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => {
      scroller.removeEventListener?.('scroll', update);
      window.removeEventListener('resize', update);
      obs.disconnect();
    };
  }, [isPost, pathname]);

  if (!isPost) return null;
  return (
    <div
      className="reading-progress"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      style={{ ['--progress' as string]: progress }}
    />
  );
}
