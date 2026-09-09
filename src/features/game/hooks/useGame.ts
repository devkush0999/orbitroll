import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { completeLevel, useAppDispatch, useAppSelector } from '@/store';
import {
  availableDirections,
  getStars,
  initialGame,
  planMove,
  sameCell,
  type MoveKind,
} from '../engine';
import { vectors } from '../levels';
import type { Direction, GameState, Level } from '../types';
import { useCommunity } from '@/features/community/CommunityProvider';

export function useGame(
  level: Level,
  { recordProgress = true }: { recordProgress?: boolean } = {},
) {
  const { session, recordRun } = useCommunity();
  const runOwner = useRef(session?.user.id ?? null);
  const trace = useRef<Direction[]>([]);
  const [state, setState] = useState(() => initialGame(level));
  const available = useMemo(
    () => availableDirections(state, level),
    [state, level],
  );
  const [seconds, setSeconds] = useState(0);
  const [motion, setMotion] = useState<MoveKind | null>(null);
  const preferences = useAppSelector((root) => root.progress);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = preferences.reducedMotion || systemReducedMotion;
  const dispatch = useAppDispatch();
  const stateRef = useRef(state),
    busy = useRef(false),
    mounted = useRef(true),
    pauseRequested = useRef(false),
    generation = useRef(0);
  const invalidateMove = useCallback(() => {
    generation.current++;
  }, []);
  const clock = useRef({ elapsed: 0, started: 0 });
  const secondsRef = useRef(0);
  const progress = useSharedValue(0),
    fromX = useSharedValue(level.path[0]!.x),
    fromZ = useSharedValue(level.path[0]!.z);
  const elevation = useSharedValue(level.path[0]!.y),
    groundY = useSharedValue(level.path[0]!.y);
  const sourceIndex = useSharedValue(0),
    targetIndex = useSharedValue(0);
  const dx = useSharedValue(0),
    dz = useSharedValue(0),
    fall = useSharedValue(0);
  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const stopClock = useCallback(() => {
    if (clock.current.started)
      clock.current.elapsed += Date.now() - clock.current.started;
    clock.current.started = 0;
    secondsRef.current = Math.floor(clock.current.elapsed / 1000);
    setSeconds(secondsRef.current);
  }, []);
  const pause = useCallback(() => {
    if (stateRef.current.status !== 'playing') return;
    pauseRequested.current = true;
    stopClock();
    if (!busy.current) commit({ ...stateRef.current, status: 'paused' });
  }, [commit, stopClock]);
  useFocusEffect(
    useCallback(
      () => () => {
        pause();
      },
      [pause],
    ),
  );
  useEffect(() => {
    mounted.current = true;
    clock.current.started = Date.now();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') pause();
    });
    const timer = setInterval(() => {
      if (stateRef.current.status === 'playing' && clock.current.started) {
        secondsRef.current = Math.floor(
          (clock.current.elapsed + Date.now() - clock.current.started) / 1000,
        );
        setSeconds(secondsRef.current);
      }
    }, 250);
    return () => {
      mounted.current = false;
      invalidateMove();
      clearInterval(timer);
      subscription.remove();
      cancelAnimation(progress);
      cancelAnimation(fall);
      cancelAnimation(elevation);
    };
  }, [elevation, fall, invalidateMove, pause, progress]);
  const finishMove = useCallback(
    (next: GameState, token: number) => {
      if (!mounted.current || token !== generation.current) return;
      busy.current = false;
      setMotion(null);
      if (next.status === 'won' || next.status === 'falling') stopClock();
      commit(
        pauseRequested.current && next.status === 'playing'
          ? { ...next, status: 'paused' }
          : next,
      );
      if (next.status === 'won' && recordProgress)
        dispatch(
          completeLevel({
            id: level.id,
            stars: getStars(next.moves, next.collected.length, level),
            moves: next.moves,
            seconds: secondsRef.current,
          }),
        );
      if (
        next.status === 'won' &&
        recordProgress &&
        runOwner.current &&
        runOwner.current === session?.user.id
      )
        void recordRun(runOwner.current, level.id, [...trace.current]);
      if (preferences.haptics) {
        const feedback =
          next.status === 'won'
            ? Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              )
            : next.status === 'falling'
              ? Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                )
              : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        void feedback.catch(() => {});
      }
    },
    [
      commit,
      dispatch,
      level,
      preferences.haptics,
      stopClock,
      recordProgress,
      recordRun,
      session?.user.id,
    ],
  );
  const move = useCallback(
    (direction: Direction) => {
      if (
        busy.current ||
        stateRef.current.status !== 'playing' ||
        pauseRequested.current
      )
        return;
      const current = stateRef.current;
      const {
        kind,
        next,
        targetIndex: destination,
      } = planMove(current, direction, level);
      if (kind === 'blocked') return;
      trace.current.push(direction);
      busy.current = true;
      setMotion(kind);
      const token = ++generation.current;
      const origin = level.path.findIndex((cell) =>
        sameCell(cell, current.position),
      );
      sourceIndex.set(origin);
      targetIndex.set(destination < 0 ? origin : destination);
      fromX.set(current.position.x);
      fromZ.set(current.position.z);
      elevation.set(current.position.y);
      groundY.set(current.position.y);
      fall.set(0);
      const vector = vectors[direction];
      dx.set(vector.x);
      dz.set(vector.z);
      progress.set(0);
      if (kind === 'lift') {
        groundY.set(next.position.y);
        elevation.set(
          withTiming(
            next.position.y,
            {
              duration: reducedMotion ? 0 : 850,
              easing: Easing.inOut(Easing.cubic),
            },
            (finished) => {
              if (finished) scheduleOnRN(finishMove, next, token);
            },
          ),
        );
        return;
      }
      const dropDuration = reducedMotion
        ? 0
        : Math.min(
            1100,
            150 +
              Math.sqrt(Math.max(0, current.position.y - next.position.y)) *
                240,
          );
      progress.set(
        withTiming(
          1,
          {
            duration: reducedMotion ? 0 : 320,
            easing: Easing.bezier(0.35, 0.04, 0.58, 1),
          },
          (finished) => {
            if (!finished) return;
            if (kind === 'drop') {
              groundY.set(next.position.y);
              elevation.set(
                withTiming(
                  next.position.y,
                  { duration: dropDuration, easing: Easing.in(Easing.quad) },
                  (landed) => {
                    if (landed) scheduleOnRN(finishMove, next, token);
                  },
                ),
              );
            } else if (kind === 'miss') {
              fall.set(
                withTiming(
                  1,
                  {
                    duration: reducedMotion ? 0 : 650,
                    easing: Easing.in(Easing.quad),
                  },
                  (ended) => {
                    if (ended) scheduleOnRN(finishMove, next, token);
                  },
                ),
              );
            } else scheduleOnRN(finishMove, next, token);
          },
        ),
      );
    },
    [
      dx,
      dz,
      elevation,
      fall,
      finishMove,
      fromX,
      fromZ,
      groundY,
      level,
      progress,
      reducedMotion,
      sourceIndex,
      targetIndex,
    ],
  );
  const restart = useCallback(() => {
    trace.current = [];
    runOwner.current = session?.user.id ?? null;
    generation.current++;
    cancelAnimation(progress);
    cancelAnimation(fall);
    cancelAnimation(elevation);
    busy.current = false;
    pauseRequested.current = false;
    setMotion(null);
    const first = level.path[0]!;
    fromX.set(first.x);
    fromZ.set(first.z);
    elevation.set(first.y);
    groundY.set(first.y);
    sourceIndex.set(0);
    targetIndex.set(0);
    dx.set(0);
    dz.set(0);
    progress.set(0);
    fall.set(0);
    clock.current = { elapsed: 0, started: Date.now() };
    secondsRef.current = 0;
    setSeconds(0);
    commit(initialGame(level));
  }, [
    commit,
    dx,
    dz,
    elevation,
    fall,
    fromX,
    fromZ,
    groundY,
    level,
    progress,
    sourceIndex,
    targetIndex,
    session?.user.id,
  ]);
  const resume = () => {
    pauseRequested.current = false;
    clock.current.started = Date.now();
    commit({ ...stateRef.current, status: 'playing' });
  };
  return {
    state,
    seconds,
    motion,
    available,
    move,
    pause,
    resume,
    restart,
    reducedMotion,
    theme: preferences.theme,
    progress,
    fromX,
    fromZ,
    dx,
    dz,
    fall,
    elevation,
    groundY,
    sourceIndex,
    targetIndex,
  };
}
