'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastState = { id: number; message: string };

type ToastApi = {
  show: (message: string) => void;
};

const Ctx = createContext<ToastApi | null>(null);
const StateCtx = createContext<ToastState | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setState({ id: Date.now(), message });
    timer.current = setTimeout(() => setState(null), 2200);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be called inside <ToastProvider>');
  return v;
}

export function useToastState(): ToastState | null {
  return useContext(StateCtx);
}
