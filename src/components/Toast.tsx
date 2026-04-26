'use client';

import { useToastState } from './ToastProvider';

export function Toast() {
  const state = useToastState();
  return (
    <div
      className="toast-host"
      role="status"
      aria-live="polite"
      data-show={state ? 'true' : 'false'}
    >
      {state?.message ?? ''}
    </div>
  );
}
