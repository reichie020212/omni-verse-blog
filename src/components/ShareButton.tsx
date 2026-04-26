'use client';

import { useToast } from './ToastProvider';

export function ShareButton({ url, title }: { url: string; title: string }) {
  const toast = useToast();

  async function share() {
    if (typeof window === 'undefined') return;
    const target = url.startsWith('http')
      ? url
      : new URL(url, window.location.origin).toString();
    const nav = window.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    try {
      if (nav.share) {
        await nav.share({ url: target, title });
      } else if (nav.clipboard) {
        await nav.clipboard.writeText(target);
      } else {
        const ta = document.createElement('textarea');
        ta.value = target;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast.show('Link copied');
    } catch {
      // user-cancelled (web share) or denied — silent
    }
  }

  return (
    <button
      type="button"
      className="share-button"
      onClick={share}
      aria-label="Share article"
    >
      Share
    </button>
  );
}
