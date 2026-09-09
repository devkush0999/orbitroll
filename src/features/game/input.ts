import type { Direction } from './types';
import type { Progress } from '../../store/progress';

export const swipeThreshold: Record<Progress['sensitivity'], number> = {
  light: 18,
  balanced: 30,
  deliberate: 46,
};

/** Reserve vertical strokes for lifts, so unavailable lifts never cause an accidental roll. */
export function swipeDirection(
  x: number,
  y: number,
  threshold: number,
  available: readonly Direction[],
): Direction | null {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    Math.hypot(x, y) < threshold
  )
    return null;
  if (Math.abs(y) > Math.abs(x) * 1.8) {
    const direction = y < 0 ? 'up' : 'down';
    return available.includes(direction) ? direction : null;
  }
  // Nearly horizontal swipes are ambiguous in an isometric view.
  if (Math.abs(y) < Math.abs(x) * 0.2) return null;
  return y < 0 ? (x < 0 ? 'west' : 'north') : x < 0 ? 'south' : 'east';
}
