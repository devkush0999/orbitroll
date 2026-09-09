import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';
import GameBoard from './GameBoard';
import { initialGame } from '../engine';
import type { Level } from '../types';
import { useAppSelector } from '@/store';

/** Static trail geometry shares the same renderer as the playable trail. */
export function TrailPreview({
  level,
  height = 260,
}: {
  level: Level;
  height?: number;
}) {
  const [width, setWidth] = useState(320);
  const state = useMemo(() => initialGame(level), [level]);
  const { theme, reducedMotion } = useAppSelector((root) => root.progress);
  const systemMotion = useReducedMotion();
  const zero = useSharedValue(0);
  const x = useSharedValue(level.path[0]!.x);
  const z = useSharedValue(level.path[0]!.z);
  const y = useSharedValue(level.path[0]!.y);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <GameBoard
        width={width}
        height={height}
        level={level}
        state={state}
        theme={theme}
        reducedMotion={reducedMotion || systemMotion}
        progress={zero}
        fromX={x}
        fromZ={z}
        dx={zero}
        dz={zero}
        fall={zero}
        elevation={y}
        groundY={y}
        sourceIndex={zero}
        targetIndex={zero}
      />
    </View>
  );
}
