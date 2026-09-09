import {
  DashPathEffect,
  Group,
  Line,
  Oval,
  Path,
} from '@shopify/react-native-skia';
import { memo } from 'react';
import { project, type Camera } from '../geometry';
import type { Level } from '../types';
import { polygon } from './skiaGeometry';
import { TRAIL_AHEAD } from '../visibility';

function VerticalGuides({
  level,
  camera,
  current,
}: {
  level: Level;
  camera: Camera;
  current: number;
}) {
  return (
    <Group>
      {level.path.map((cell, index) => {
        const previous = level.path[index - 1];
        if (
          !previous ||
          index <= current ||
          index > current + TRAIL_AHEAD ||
          cell.y >= previous.y ||
          (cell.x === previous.x && cell.z === previous.z)
        )
          return null;
        const start = project({ ...cell, y: previous.y + 0.1 }, camera);
        const end = project(cell, camera);
        return (
          <Group key={`drop-${index}`}>
            <Line
              p1={start}
              p2={end}
              color="#FFD38E"
              strokeWidth={1.2}
              opacity={0.55}
            >
              <DashPathEffect intervals={[4, 5]} />
            </Line>
            <Oval
              x={end.x - camera.unit * 0.65}
              y={end.y - camera.unit * 0.4}
              width={camera.unit * 1.3}
              height={camera.unit * 0.8}
              color="#FFD38E"
              style="stroke"
              strokeWidth={1.5}
              opacity={0.65}
            />
            <Path
              path={polygon(
                [
                  { ...cell, y: previous.y - 0.45 },
                  { x: cell.x - 0.13, y: previous.y - 0.2, z: cell.z + 0.13 },
                  { x: cell.x + 0.13, y: previous.y - 0.2, z: cell.z - 0.13 },
                ],
                camera,
              )}
              color="#FFD38E"
            />
          </Group>
        );
      })}
      {level.lifts.map(({ from, to }) => {
        if (
          Math.max(from, to) < current ||
          Math.max(from, to) > current + TRAIL_AHEAD
        )
          return null;
        const a = level.path[from]!,
          b = level.path[to]!;
        const start = project(a, camera),
          end = project(b, camera);
        return (
          <Group key={`lift-${from}-${to}`}>
            <Line
              p1={start}
              p2={end}
              color="#80EAF3"
              strokeWidth={camera.unit * 0.36}
              opacity={0.06}
            />
            <Line
              p1={start}
              p2={end}
              color="#80EAF3"
              strokeWidth={1}
              opacity={0.5}
            >
              <DashPathEffect intervals={[2, 6]} />
            </Line>
            {[0.25, 0.5, 0.75].map((fraction) => {
              const y = start.y + (end.y - start.y) * fraction;
              return (
                <Oval
                  key={fraction}
                  x={start.x - camera.unit * 0.27}
                  y={y - camera.unit * 0.15}
                  width={camera.unit * 0.54}
                  height={camera.unit * 0.3}
                  color="#80EAF3"
                  style="stroke"
                  strokeWidth={0.7}
                  opacity={0.35}
                />
              );
            })}
          </Group>
        );
      })}
    </Group>
  );
}
export default memo(VerticalGuides);
