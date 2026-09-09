import type { Level } from './types';
import { CAMERA_TILT } from './geometry';

export const TRAIL_AHEAD = 3;
export const TRAIL_BEHIND = 2;

/** Visibility is presentation only: hidden platforms retain their collision geometry. */
export function tileVisibility(
  level: Level,
  current: number,
  index: number,
): number {
  'worklet';
  const distance = index - current;
  if (distance < -TRAIL_BEHIND || distance > TRAIL_AHEAD) return 0;
  const active = level.path[current]!;
  const tile = level.path[index]!;
  if (distance === 0) return 1;
  if (distance < 0)
    return tile.y > active.y ? 0.08 : distance === -1 ? 0.38 : 0.16;
  if (tile.y !== active.y) return distance === 1 ? 0.85 : 0.4;
  return distance === TRAIL_AHEAD ? 0.7 : 1;
}

/** Include the source deck and destination before a transfer, so a drop is never blind. */
export function trailFrame(
  level: Level,
  current: number,
  source: number,
  width: number,
  height: number,
) {
  'worklet';
  const indices = new Set<number>([current, source]);
  for (
    let i = Math.max(0, current - 1);
    i <= Math.min(level.path.length - 1, current + TRAIL_AHEAD);
    i++
  )
    if (i >= current || level.path[i]!.y === level.path[current]!.y)
      indices.add(i);
  const points = [...indices].map((index) => level.path[index]!);
  const xs = points.map((p) => p.x - p.z);
  const ys = points.map((p) => (p.x + p.z) * CAMERA_TILT - p.y);
  const left = Math.min(...xs) - 1.25,
    right = Math.max(...xs) + 1.25;
  const top = Math.min(...ys) - 1.7,
    bottom = Math.max(...ys) + 1.2;
  const unit = Math.max(
    8,
    Math.min(54, (width - 24) / (right - left), (height - 50) / (bottom - top)),
  );
  return { x: (left + right) / 2, y: (top + bottom) / 2, unit };
}
