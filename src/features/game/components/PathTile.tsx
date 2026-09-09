import {
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import {
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { mixHex, project, type Camera } from '../geometry';
import { polygon, tileCorners } from './skiaGeometry';

type Props = {
  x: number;
  z: number;
  y: number;
  visibility: number;
  revealDelay: number;
  liftPad?: boolean;
  dropEdge?: { x: number; z: number };
  routeArrow?: { x: number; z: number };
  next?: boolean;
  camera: Camera;
  color: string;
  visited: boolean;
  finish: boolean;
  hasGem: boolean;
  reducedMotion: boolean;
};

function PathTile({
  x,
  z,
  y,
  liftPad,
  visibility: targetVisibility,
  revealDelay,
  dropEdge,
  routeArrow,
  next = false,
  camera,
  color,
  visited,
  finish,
  hasGem,
  reducedMotion,
}: Props) {
  const arrow = dropEdge ?? routeArrow;
  const focus = useSharedValue(next ? 1 : 0);
  useEffect(() => {
    focus.set(withTiming(next ? 1 : 0, { duration: reducedMotion ? 0 : 220 }));
  }, [next, reducedMotion, focus]);
  const visibility = useSharedValue(0);
  const assembled = useSharedValue(0);
  useEffect(() => {
    visibility.set(
      withDelay(
        reducedMotion || targetVisibility === 0 ? 0 : revealDelay,
        withTiming(targetVisibility, { duration: reducedMotion ? 0 : 420 }),
      ),
    );
    assembled.set(
      withDelay(
        reducedMotion || targetVisibility === 0 ? 0 : revealDelay,
        withTiming(targetVisibility > 0 ? 1 : 0, {
          duration: reducedMotion ? 0 : 580,
          easing: Easing.out(Easing.cubic),
        }),
      ),
    );
  }, [targetVisibility, revealDelay, reducedMotion, visibility, assembled]);
  const charge = useSharedValue(visited ? 1 : 0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    charge.set(
      withTiming(visited ? 1 : 0, { duration: reducedMotion ? 0 : 380 }),
    );
    if (visited && !reducedMotion) {
      pulse.set(1);
      pulse.set(withTiming(0, { duration: 750 }));
    }
  }, [visited, reducedMotion, charge, pulse]);
  const geometry = useMemo(() => {
    const top = tileCorners(x, z, y);
    const bevel = tileCorners(x, z, y - 0.075, 0.5);
    const bottom = tileCorners(x, z, y - 0.52, 0.5);
    const lower = tileCorners(x, z, y - 0.56, 0.45);
    const center = project({ x, y, z }, camera);
    const face = (a: number, b: number) =>
      polygon([bevel[a]!, bevel[b]!, bottom[b]!, bottom[a]!], camera);
    return {
      center,
      top: polygon(top, camera),
      inset: polygon(tileCorners(x, z, y + 0.002, 0.36), camera),
      front: face(2, 3),
      right: face(1, 2),
      topBevel: polygon(
        [top[1]!, top[2]!, top[3]!, bevel[3]!, bevel[2]!, bevel[1]!],
        camera,
      ),
      underside: polygon(
        [bottom[1]!, bottom[2]!, bottom[3]!, lower[3]!, lower[2]!, lower[1]!],
        camera,
      ),
      rail: polygon(
        [
          { x: x + 0.5, z: z - 0.37, y: y - 0.37 },
          { x: x + 0.5, z: z + 0.5, y: y - 0.37 },
          { x: x - 0.37, z: z + 0.5, y: y - 0.37 },
        ],
        camera,
        false,
      ),
      gemLeft: polygon(
        [
          { x, y: y + 0.8, z },
          { x, y: y + 0.4, z: z + 0.2 },
          { x, y: y + 0.05, z },
          { x: x - 0.2, y: y + 0.4, z },
        ],
        camera,
      ),
      gemRight: polygon(
        [
          { x, y: y + 0.8, z },
          { x: x + 0.2, y: y + 0.4, z },
          { x, y: y + 0.05, z },
          { x, y: y + 0.4, z: z + 0.2 },
        ],
        camera,
      ),
    };
  }, [x, y, z, camera]);
  const surface = useDerivedValue(() =>
    interpolateColor(
      charge.value,
      [0, 1],
      [mixHex(color, '#101B2C', 0.43), mixHex(color, '#132138', 0.16)],
    ),
  );
  const border = useDerivedValue(() =>
    interpolateColor(
      charge.value,
      [0, 1],
      [mixHex(color, '#20384B', 0.16), mixHex(color, '#FFFFFF', 0.3)],
    ),
  );
  const railOpacity = useDerivedValue(() => 0.4 + charge.value * 0.5);
  const glowOpacity = useDerivedValue(
    () => charge.value * 0.09 + pulse.value * 0.13 + focus.value * 0.12,
  );
  const ringOpacity = useDerivedValue(() => pulse.value * 0.6);
  const ringTransform = useDerivedValue(() => [
    { scale: 1 + (1 - pulse.value) * 0.6 },
  ]);
  const { center } = geometry;
  const assemblyTransform = useDerivedValue(() => [
    { translateY: (1 - assembled.value) * camera.unit * 0.8 },
    { scale: 0.84 + assembled.value * 0.16 },
  ]);
  return (
    <Group
      opacity={visibility}
      transform={assemblyTransform}
      origin={vec(center.x, center.y)}
    >
      <Circle
        cx={center.x}
        cy={center.y + camera.unit * 0.5}
        r={camera.unit * 1.5}
        opacity={glowOpacity}
      >
        <RadialGradient
          c={vec(center.x, center.y + camera.unit * 0.5)}
          r={camera.unit * 1.5}
          colors={[color, `${color}00`]}
        />
      </Circle>
      <Path path={geometry.underside} color="#07111E" />
      <Path path={geometry.front}>
        <LinearGradient
          start={vec(center.x, center.y)}
          end={vec(center.x, center.y + camera.unit * 1.2)}
          colors={[mixHex(color, '#0C1728', 0.63), '#0A1322']}
        />
      </Path>
      <Path path={geometry.right}>
        <LinearGradient
          start={vec(center.x + camera.unit, center.y)}
          end={vec(center.x, center.y + camera.unit)}
          colors={[
            mixHex(color, '#132239', 0.4),
            mixHex(color, '#0D1525', 0.82),
          ]}
        />
      </Path>
      <Path
        path={geometry.rail}
        color={color}
        opacity={railOpacity}
        style="stroke"
        strokeWidth={1.4}
      />
      <Path path={geometry.topBevel} color={mixHex(color, '#17263B', 0.46)} />
      <Path path={geometry.top} color={surface} />
      <Path
        path={geometry.top}
        color="#F2FDFF"
        opacity={focus}
        style="stroke"
        strokeWidth={2.4}
        strokeJoin="round"
      />
      <Path
        path={geometry.top}
        color={border}
        style="stroke"
        strokeWidth={1.1}
        strokeJoin="round"
      />
      <Path
        path={geometry.inset}
        color={border}
        style="stroke"
        strokeWidth={0.6}
        opacity={0.25}
      />
      <Group
        opacity={ringOpacity}
        transform={ringTransform}
        origin={vec(center.x, center.y)}
      >
        <Oval
          x={center.x - camera.unit}
          y={center.y - camera.unit * 0.6}
          width={camera.unit * 2}
          height={camera.unit * 1.2}
          color={color}
          style="stroke"
          strokeWidth={1.6}
        />
      </Group>
      {liftPad && (
        <Group>
          <Oval
            x={center.x - camera.unit * 0.34}
            y={center.y - camera.unit * 0.2}
            width={camera.unit * 0.68}
            height={camera.unit * 0.4}
            color="#80EAF3"
            style="stroke"
            strokeWidth={2}
          />
          <Oval
            x={center.x - camera.unit * 0.2}
            y={center.y - camera.unit * 0.12}
            width={camera.unit * 0.4}
            height={camera.unit * 0.24}
            color="#80EAF3"
            opacity={0.35}
          />
        </Group>
      )}
      {arrow && (
        <Path
          path={polygon(
            [
              {
                x: x + arrow.x * 0.43,
                y: y + 0.015,
                z: z + arrow.z * 0.43,
              },
              {
                x: x + arrow.x * 0.16 - arrow.z * 0.15,
                y: y + 0.015,
                z: z + arrow.z * 0.16 + arrow.x * 0.15,
              },
              {
                x: x + arrow.x * 0.24,
                y: y + 0.015,
                z: z + arrow.z * 0.24,
              },
              {
                x: x + arrow.x * 0.16 + arrow.z * 0.15,
                y: y + 0.015,
                z: z + arrow.z * 0.16 - arrow.x * 0.15,
              },
            ],
            camera,
          )}
          color={dropEdge ? '#FFD38E' : '#F2FDFF'}
          opacity={dropEdge ? 1 : 0.85}
        />
      )}
      {hasGem && (
        <Group>
          <Oval
            x={center.x - camera.unit * 0.2}
            y={center.y - camera.unit * 0.09}
            width={camera.unit * 0.4}
            height={camera.unit * 0.18}
            color="#050E18"
            opacity={0.4}
          />
          <Path
            path={geometry.gemLeft}
            color={mixHex(color, '#FFFFFF', 0.55)}
          />
          <Path path={geometry.gemRight} color={color} />
        </Group>
      )}
      {finish && (
        <Group>
          <Oval
            x={center.x - camera.unit * 0.38}
            y={center.y - camera.unit * 0.19}
            width={camera.unit * 0.76}
            height={camera.unit * 0.38}
            color={color}
            opacity={0.35}
          />
          <Oval
            x={center.x - camera.unit * 0.38}
            y={center.y - camera.unit * 1.1}
            width={camera.unit * 0.76}
            height={camera.unit * 1.15}
            color={color}
            opacity={0.1}
          />
          <Oval
            x={center.x - camera.unit * 0.38}
            y={center.y - camera.unit * 1.1}
            width={camera.unit * 0.76}
            height={camera.unit * 1.15}
            color={color}
            style="stroke"
            strokeWidth={3}
          />
          <Oval
            x={center.x - camera.unit * 0.28}
            y={center.y - camera.unit * 0.98}
            width={camera.unit * 0.56}
            height={camera.unit * 0.91}
            color="#F2EBFF"
            style="stroke"
            strokeWidth={0.8}
            opacity={0.6}
          />
        </Group>
      )}
    </Group>
  );
}
export default memo(PathTile);
