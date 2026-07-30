// Reveal mode — DEV ONLY. import.meta.env.DEV ensures Vite tree-shakes
// this entire module from production bundle.

import { useEffect, useState } from 'react';

const STORAGE_KEY = '__dev_reveal';
const PARAM = '__dev';

export function isRevealActive(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(PARAM) === '1') {
      sessionStorage.setItem(STORAGE_KEY, '1');
      return true;
    }
    if (params.get(PARAM) === '0') {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useRevealMode(): boolean {
  const [active, setActive] = useState(isRevealActive);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onPop = () => setActive(isRevealActive());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return active;
}
