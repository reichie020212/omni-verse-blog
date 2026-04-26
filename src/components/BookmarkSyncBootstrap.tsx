'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { mergeBookmarks } from '@/lib/bookmarks-actions';
import { useToast } from './ToastProvider';

const STORAGE_KEY = 'ovb-bookmarks';
const SESSION_FLAG = 'ovb-bookmark-sync-ran';

export function BookmarkSyncBootstrap() {
  const session = useSession();
  const ran = useRef(false);
  const toast = useToast();

  useEffect(() => {
    if (ran.current) return;
    if (session.status !== 'authenticated') return;
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(SESSION_FLAG)) return;
    let slugs: string[] = [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      slugs = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      slugs = [];
    }
    if (slugs.length === 0) {
      window.sessionStorage.setItem(SESSION_FLAG, '1');
      ran.current = true;
      return;
    }
    ran.current = true;
    void (async () => {
      try {
        const { added } = await mergeBookmarks(slugs);
        window.localStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.setItem(SESSION_FLAG, '1');
        if (added > 0) toast.show(`Synced ${added} bookmark${added === 1 ? '' : 's'}`);
      } catch {
        // fail silently
      }
    })();
  }, [session.status, toast]);

  return null;
}
