import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { VERTICAL_ENTRY_LEVEL } from '../features/game/levels';
import type { SpaceTheme } from '../theme/tokens';

import {
  initialState,
  parseProgress,
  type Progress,
  type Result,
} from './progress';
export type { Progress } from './progress';
const slice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    hydrate: (_state, action: PayloadAction<Progress>) => action.payload,
    completeLevel: (
      state,
      { payload }: PayloadAction<Result & { id: number }>,
    ) => {
      const old = state.results[payload.id];
      state.results[payload.id] = {
        stars: Math.max(old?.stars ?? 0, payload.stars),
        moves: Math.min(old?.moves ?? Infinity, payload.moves),
        seconds: payload.seconds === null ? old?.seconds ?? null : Math.min(old?.seconds ?? Infinity, payload.seconds),
      };
    },
    setTheme: (state, action: PayloadAction<SpaceTheme>) => {
      state.theme = action.payload;
    },
    toggleHaptics: (state) => {
      state.haptics = !state.haptics;
    },
    toggleMotion: (state) => {
      state.reducedMotion = !state.reducedMotion;
    },
    updatePreferences: (
      state,
      { payload }: PayloadAction<Partial<Omit<Progress, 'results'>>>,
    ) => {
      Object.assign(state, payload);
    },
    restorePreferences: (state) => ({
      ...initialState,
      results: state.results,
      onboardingComplete: state.onboardingComplete,
    }),
    resetProgress: (state) => {
      state.results = {};
    },
    mergeCloudResults: (
      state,
      {
        payload,
      }: PayloadAction<{ level_id: number; stars: number; moves: number }[]>,
    ) => {
      for (const result of payload) {
        const old = state.results[result.level_id];
        state.results[result.level_id] = {
          stars: Math.max(old?.stars ?? 0, result.stars),
          moves: Math.min(old?.moves ?? Infinity, result.moves),
          seconds: old?.seconds ?? null,
        };
      }
    },
  },
});
export const {
  completeLevel,
  setTheme,
  toggleHaptics,
  toggleMotion,
  resetProgress,
  updatePreferences,
  restorePreferences,
  mergeCloudResults,
} = slice.actions;
type SaveStatus = 'loading' | 'saving' | 'saved' | 'error';
const persistence = createSlice({
  name: 'persistence',
  initialState: { status: 'loading' as SaveStatus },
  reducers: {
    setStatus: (state, action: PayloadAction<SaveStatus>) => {
      state.status = action.payload;
    },
  },
});
export const store = configureStore({
  reducer: { progress: slice.reducer, persistence: persistence.reducer },
});
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
const KEY = 'orbit-roll:progress:v1';
let activeKey = KEY;
let scopeVersion = 0;
let hydrated = false;
let writeQueue = Promise.resolve();
let lastProgress = store.getState().progress;
let writeVersion = 0;
export function retrySave() {
  if (!hydrated) return;
  const version = ++writeVersion;
  const snapshot = JSON.stringify(store.getState().progress);
  const destination = activeKey;
  store.dispatch(persistence.actions.setStatus('saving'));
  writeQueue = writeQueue
    .then(() => AsyncStorage.setItem(destination, snapshot))
    .then(() => {
      if (version === writeVersion)
        store.dispatch(persistence.actions.setStatus('saved'));
    })
    .catch((error: unknown) => {
      console.warn('Could not save game progress', error);
      if (version === writeVersion)
        store.dispatch(persistence.actions.setStatus('error'));
    });
}
store.subscribe(() => {
  const progress = store.getState().progress;
  if (!hydrated || progress === lastProgress) return;
  lastProgress = progress;
  retrySave();
});
export async function loadProgress() {
  let failed = false;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) store.dispatch(slice.actions.hydrate(parseProgress(raw)));
  } catch (error) {
    failed = true;
    console.warn('Could not load saved game; using defaults', error);
  } finally {
    hydrated = true;
    lastProgress = store.getState().progress;
    store.dispatch(persistence.actions.setStatus(failed ? 'error' : 'saved'));
  }
}
export async function switchProgressOwner(userId: string | null) {
  const destination = userId ? `orbit-roll:progress:user:${userId}:v1` : KEY;
  if (destination === activeKey && hydrated) return;
  const version = ++scopeVersion;
  ++writeVersion;
  hydrated = false;
  store.dispatch(persistence.actions.setStatus('loading'));
  try {
    await writeQueue;
    const raw = await AsyncStorage.getItem(destination);
    if (version !== scopeVersion) return;
    const results = raw ? parseProgress(raw).results : {};
    activeKey = destination;
    store.dispatch(
      slice.actions.hydrate({ ...store.getState().progress, results }),
    );
    lastProgress = store.getState().progress;
    hydrated = true;
    store.dispatch(persistence.actions.setStatus('saved'));
  } catch (error) {
    if (version !== scopeVersion) return;
    activeKey = destination;
    store.dispatch(
      slice.actions.hydrate({ ...store.getState().progress, results: {} }),
    );
    lastProgress = store.getState().progress;
    hydrated = true;
    store.dispatch(persistence.actions.setStatus('error'));
    throw error;
  }
}
export const isUnlocked = (id: number, results: Progress['results']) =>
  id === 1 || id === VERTICAL_ENTRY_LEVEL || Boolean(results[id - 1]);
