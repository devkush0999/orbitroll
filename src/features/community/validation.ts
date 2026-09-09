import type { Direction } from '../game/types';
export type PendingRun = {
  id: string;
  level: number;
  revision: number;
  directions: Direction[];
};
export const validUsername = (value: string) => /^[a-z0-9_]{3,24}$/.test(value);
export const validInvite = (value: string) => /^[a-f0-9]{32}$/.test(value);
export function parseQueue(raw: string | null): PendingRun[] {
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 50)
    throw new Error(
      'Saved run queue is unreadable. Your local game progress is still available.',
    );
  const directions = new Set(['north', 'east', 'south', 'west', 'up', 'down']);
  if (
    !value.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const run = item as Record<string, unknown>;
      return (
        typeof run.id === 'string' &&
        /^[a-f0-9-]{36}$/i.test(run.id) &&
        Number.isInteger(run.level) &&
        Number(run.level) >= 1 &&
        Number(run.level) <= 18 &&
        Number.isInteger(run.revision) &&
        Number(run.revision) >= 1 &&
        Array.isArray(run.directions) &&
        run.directions.length >= 1 &&
        run.directions.length <= 512 &&
        run.directions.every(
          (direction) =>
            typeof direction === 'string' && directions.has(direction),
        )
      );
    })
  )
    throw new Error(
      'Saved run queue is unreadable. Your local game progress is still available.',
    );
  return value as PendingRun[];
}
export function publicUrl(origin: string | undefined, path: string): string {
  if (!origin)
    throw new Error(
      'Sharing needs the website address. Set EXPO_PUBLIC_SITE_URL when building the app.',
    );
  const url = new URL(origin);
  if (
    url.protocol !== 'https:' &&
    !(
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname)
    )
  )
    throw new Error('The website address must use HTTPS.');
  if (
    url.username ||
    url.password ||
    !/^\/(player\/[a-z0-9_]{3,24}|invite\/[a-f0-9]{32})$/.test(path)
  )
    throw new Error('Invalid share link');
  return `${url.origin}${path}`;
}
