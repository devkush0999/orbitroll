import { levels } from '../features/game/levels';
import type { SpaceTheme } from '../theme/tokens';

export type Result = { stars: number; moves: number; seconds: number | null };
export type Progress = {
  results: Record<number, Result>;
  theme: SpaceTheme;
  haptics: boolean;
  reducedMotion: boolean;
  fullscreen: boolean;
  controlMode: 'buttons' | 'gestures';
  sensitivity: 'light' | 'balanced' | 'deliberate';
  showHints: boolean;
  onboardingComplete: boolean;
};
export const initialState: Progress = {
  results: {},
  theme: 'nebula',
  haptics: true,
  reducedMotion: false,
  fullscreen: false,
  controlMode: 'buttons',
  sensitivity: 'balanced',
  showHints: true,
  onboardingComplete: false,
};
export function parseProgress(raw: string): Progress {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') return initialState;
  const data = value as Record<string, unknown>;
  const results: Progress['results'] = {};
  if (data.results && typeof data.results === 'object') {
    for (const [id, result] of Object.entries(data.results)) {
      if (
        !levels.some((level) => level.id === Number(id)) ||
        !result ||
        typeof result !== 'object'
      )
        continue;
      const record = result as Record<string, unknown>;
      if (
        [record.stars, record.moves].every(
          (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0,
        ) &&
        (record.seconds === null ||
          (typeof record.seconds === 'number' &&
            Number.isFinite(record.seconds) &&
            record.seconds >= 0)) &&
        Number(record.stars) >= 1 &&
        Number(record.stars) <= 3 &&
        Number.isInteger(record.stars)
      ) {
        results[Number(id)] = {
          stars: Number(record.stars),
          moves: Number(record.moves),
          seconds: record.seconds === null ? null : Number(record.seconds),
        };
      }
    }
  }
  return {
    results,
    theme:
      data.theme === 'aurora' || data.theme === 'solar' ? data.theme : 'nebula',
    haptics: typeof data.haptics === 'boolean' ? data.haptics : true,
    reducedMotion: data.reducedMotion === true,
    fullscreen: data.fullscreen === true,
    controlMode: data.controlMode === 'gestures' ? 'gestures' : 'buttons',
    sensitivity:
      data.sensitivity === 'light' || data.sensitivity === 'deliberate'
        ? data.sensitivity
        : 'balanced',
    showHints: data.showHints !== false,
    onboardingComplete:
      data.onboardingComplete === true ||
      (data.onboardingComplete === undefined &&
        Object.keys(results).length > 0),
  };
}
