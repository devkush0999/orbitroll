import {
  Canvas,
  Group,
  Circle,
  Oval,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { GameState, Level } from '../types';
import { CAMERA_TILT, trailColor } from '../geometry';
import { spaceThemes, type SpaceTheme } from '@/theme/tokens';
import Cube3D from './Cube3D';
import PathTile from './PathTile';
import VerticalGuides from './VerticalGuides';
import { tileVisibility, trailFrame } from '../visibility';
import { sameCell } from '../engine';

export type BoardProps = {
  width: number;
  height: number;
  level: Level;
  state: GameState;
  theme: SpaceTheme;
  reducedMotion: boolean;
  progress: SharedValue<number>;
  fromX: SharedValue<number>;
  fromZ: SharedValue<number>;
  dx: SharedValue<number>;
  dz: SharedValue<number>;
  fall: SharedValue<number>;
  elevation: SharedValue<number>;
  groundY: SharedValue<number>;
  sourceIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
};

function GameBoard(props: BoardProps) {
  const { width, height, level, state, theme, reducedMotion } = props;
  const palette = spaceThemes[theme];
  const current = Math.max(
    0,
    level.path.findIndex((cell) => sameCell(cell, state.position)),
  );
  const camera = useMemo(() => ({ unit: 32, x: 0, y: 0 }), []);
  const frame = useMemo(
    () => trailFrame(level, current, current, width, height),
    [level, current, width, height],
  );
  const focusX = useSharedValue(frame.x * 32);
  const focusY = useSharedValue(frame.y * 32);
  const zoom = useSharedValue(frame.unit / 32);
  useEffect(() => {
    const config = {
      duration: reducedMotion ? 0 : 650,
      easing: Easing.inOut(Easing.cubic),
    };
    focusX.set(withTiming(frame.x * 32, config));
    focusY.set(withTiming(frame.y * 32, config));
    zoom.set(withTiming(frame.unit / 32, config));
  }, [frame, reducedMotion, focusX, focusY, zoom]);
  const worldTransform = useDerivedValue(() => [
    { translateX: width / 2 },
    { translateY: height / 2 + 8 },
    { scale: zoom.value },
    { translateX: -focusX.value },
    { translateY: -focusY.value },
  ]);
  const trailColors = useMemo(
    () =>
      level.path.map((_, index) =>
        trailColor(index, level.path.length, palette.trail),
      ),
    [level, palette],
  );
  const ordered = useMemo(
    () =>
      level.path
        .map((cell, index) => ({ ...cell, index }))
        .sort(
          (a, b) =>
            a.x + a.z + a.y / CAMERA_TILT - b.x - b.z - b.y / CAMERA_TILT,
        ),
    [level],
  );
  return (
    <Canvas style={{ width, height }} accessible={false}>
      <Circle cx={width * 0.65} cy={height * 0.35} r={width * 0.7}>
        <RadialGradient
          c={vec(width * 0.65, height * 0.35)}
          r={width * 0.7}
          colors={[`${palette.planet}50`, '#080D1800']}
        />
      </Circle>
      {Array.from({ length: 65 }, (_, i) => (
        <Circle
          key={i}
          cx={(i * 73.31 + 9) % width}
          cy={(i * 43.17 + 3) % height}
          r={i % 8 === 0 ? 1.3 : 0.65}
          color="#AFBED8"
          opacity={0.2 + (i % 5) * 0.1}
        />
      ))}
      <Circle
        cx={width - 47}
        cy={53}
        r={31}
        color={palette.planet}
        opacity={0.3}
      />
      <Oval
        x={width - 99}
        y={41}
        width={107}
        height={22}
        style="stroke"
        strokeWidth={0.7}
        color="#91A2C8"
        opacity={0.24}
      />
      <Group transform={worldTransform}>
        <VerticalGuides level={level} camera={camera} current={current} />
        {ordered.map(({ x, y, z, index }) => (
          <PathTile
            key={index}
            x={x}
            z={z}
            y={y}
            next={index === current + 1}
            routeArrow={
              index >= current && level.path[index + 1]?.y === y
                ? {
                    x: level.path[index + 1]!.x - x,
                    z: level.path[index + 1]!.z - z,
                  }
                : undefined
            }
            visibility={tileVisibility(level, current, index)}
            revealDelay={Math.max(0, index - current) * 65}
            liftPad={level.lifts.some(
              (lift) => lift.from === index || lift.to === index,
            )}
            dropEdge={
              level.path[index + 1] &&
              level.path[index + 1]!.y < y &&
              (level.path[index + 1]!.x !== x || level.path[index + 1]!.z !== z)
                ? {
                    x: level.path[index + 1]!.x - x,
                    z: level.path[index + 1]!.z - z,
                  }
                : undefined
            }
            camera={camera}
            color={trailColors[index]!}
            visited={state.visited.includes(index)}
            finish={index === level.path.length - 1}
            hasGem={
              level.gems.includes(index) && !state.collected.includes(index)
            }
            reducedMotion={reducedMotion}
          />
        ))}
        <Cube3D {...props} camera={camera} trailColors={trailColors} />
      </Group>
    </Canvas>
  );
}
export default memo(GameBoard);
