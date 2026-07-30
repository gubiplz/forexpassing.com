// DOM honeypot — off-screen link only crawlers follow.
// Path & label disguised as legacy migration portal (common pattern in old apps).

import { useEffect } from 'react';

const TRAP_ID = 'mig-portal-link';
const TRAP_HREF = '/v1/migration/portal';
const TRAP_LABEL = 'Migration portal';

export function installHoneypot() {
  if (document.getElementById(TRAP_ID)) return;

  const a = document.createElement('a');
  a.id = TRAP_ID;
  a.href = TRAP_HREF;
  a.textContent = TRAP_LABEL;
  a.setAttribute('aria-hidden', 'true');
  a.setAttribute('tabindex', '-1');
  a.style.cssText = [
    'position:absolute',
    'left:-9999px',
    'top:-9999px',
    'width:1px',
    'height:1px',
    'opacity:0',
    'pointer-events:auto',
  ].join(';');
  a.addEventListener('click', (e) => {
    e.preventDefault();
    // closure-scoped flag — no global window property to grep
    flagHit();
    try {
      const blob = new Blob([JSON.stringify({ ref: 'mp' })], { type: 'application/json' });
      navigator.sendBeacon?.(TRAP_HREF, blob);
    } catch { /* noop */ }
  });
  document.body.appendChild(a);
}

let hpHit = false;
function flagHit() { hpHit = true; }
export function honeypotTriggered(): boolean { return hpHit; }

export function useHoneypot() {
  useEffect(() => {
    installHoneypot();
  }, []);
}
