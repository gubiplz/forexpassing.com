// Behavioral fingerprint — 5s sampling window post-mount.
// Advanced: jerk (3rd derivative), click timing variance, pointermove vs mousemove.

import { honeypotTriggered } from './honeypot';

interface BehaviorSnapshot {
  mouseEntropy: number;       // cumulative distance
  mouseJerk: number;          // sum of |dv/dt| second-differences (boty mają smooth bezier)
  scrollCount: number;
  keyboardCount: number;
  clickTimingVariance: number; // variance of mouseDown→mouseUp delays
  pointermoveCount: number;
  msToFirstInteraction: number | null;
  tg: boolean;
}

const SAMPLE_WINDOW_MS = 1_500;

export function startBehaviorCollector(): () => Promise<BehaviorSnapshot> {
  let mouseEntropy = 0;
  let lastX: number | null = null;
  let lastY: number | null = null;
  let lastT: number | null = null;
  let lastVx: number | null = null;
  let lastVy: number | null = null;
  let mouseJerk = 0;
  let scrollCount = 0;
  let keyboardCount = 0;
  let pointermoveCount = 0;
  const clickDelays: number[] = [];
  const downAt = new Map<number, number>();
  let firstInteractionAt: number | null = null;
  const startedAt = performance.now();

  const recordInteraction = () => {
    if (firstInteractionAt === null) {
      firstInteractionAt = performance.now() - startedAt;
    }
  };

  const onMove = (e: MouseEvent) => {
    recordInteraction();
    const now = performance.now();
    if (lastX !== null && lastY !== null && lastT !== null) {
      const dt = Math.max(1, now - lastT);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      mouseEntropy += Math.sqrt(dx * dx + dy * dy);
      const vx = dx / dt;
      const vy = dy / dt;
      if (lastVx !== null && lastVy !== null) {
        const ax = vx - lastVx;
        const ay = vy - lastVy;
        mouseJerk += Math.sqrt(ax * ax + ay * ay);
      }
      lastVx = vx;
      lastVy = vy;
    }
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
  };

  const onPointerMove = () => {
    pointermoveCount += 1;
  };

  const onMouseDown = (e: MouseEvent) => {
    recordInteraction();
    downAt.set(e.button, performance.now());
  };
  const onMouseUp = (e: MouseEvent) => {
    const d = downAt.get(e.button);
    if (d !== undefined) {
      clickDelays.push(performance.now() - d);
      downAt.delete(e.button);
    }
  };

  const onScroll = () => {
    recordInteraction();
    scrollCount += 1;
  };

  const onKey = () => {
    recordInteraction();
    keyboardCount += 1;
  };

  const onTouchMove = (e: TouchEvent) => {
    recordInteraction();
    const t = e.touches[0];
    if (!t) return;
    const now = performance.now();
    if (lastX !== null && lastY !== null && lastT !== null) {
      const dt = Math.max(1, now - lastT);
      const dx = t.clientX - lastX;
      const dy = t.clientY - lastY;
      mouseEntropy += Math.sqrt(dx * dx + dy * dy);
      const vx = dx / dt;
      const vy = dy / dt;
      if (lastVx !== null && lastVy !== null) {
        const ax = vx - lastVx;
        const ay = vy - lastVy;
        mouseJerk += Math.sqrt(ax * ax + ay * ay);
      }
      lastVx = vx;
      lastVy = vy;
    }
    lastX = t.clientX;
    lastY = t.clientY;
    lastT = now;
  };

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('mousedown', onMouseDown, { passive: true });
  window.addEventListener('mouseup', onMouseUp, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKey, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  const stopAndSnapshot = () =>
    new Promise<BehaviorSnapshot>((resolve) => {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, SAMPLE_WINDOW_MS - elapsed);
      setTimeout(() => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('touchmove', onTouchMove);

        let clickTimingVariance = 0;
        if (clickDelays.length >= 2) {
          const mean = clickDelays.reduce((a, b) => a + b, 0) / clickDelays.length;
          clickTimingVariance =
            clickDelays.reduce((a, b) => a + (b - mean) ** 2, 0) / clickDelays.length;
        }

        resolve({
          mouseEntropy,
          mouseJerk,
          scrollCount,
          keyboardCount,
          clickTimingVariance,
          pointermoveCount,
          msToFirstInteraction: firstInteractionAt,
          tg: honeypotTriggered(),
        });
      }, remaining);
    });

  return stopAndSnapshot;
}

export type { BehaviorSnapshot };
