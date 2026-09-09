import {
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { memo } from 'react';
import { spaceThemes, type SpaceTheme } from '@/theme/tokens';
import { mixHex, trailColor } from '@/features/game/geometry';
export type SpaceSceneProps = {
  width: number;
  height: number;
  theme: SpaceTheme;
};
function polygon(points: number[][]) {
  const path = Skia.Path.Make();
  points.forEach(([x, y], i) =>
    i === 0 ? path.moveTo(x!, y!) : path.lineTo(x!, y!),
  );
  return path.close();
}
function SpaceScene({ width, height, theme }: SpaceSceneProps) {
  const palette = spaceThemes[theme];
  const scale = width / 360;
  return (
    <Canvas style={{ width, height }} accessible={false}>
      <Group transform={[{ scale }]}>
        <Circle cx={235} cy={110} r={145}>
          <RadialGradient
            c={vec(235, 110)}
            r={145}
            colors={[`${palette.planet}60`, '#080D1800']}
          />
        </Circle>
        {Array.from({ length: 55 }, (_, i) => (
          <Circle
            key={i}
            cx={(i * 71.7 + 13) % 360}
            cy={(i * 37.3 + 7) % (height / scale)}
            r={i % 7 === 0 ? 1.4 : 0.65}
            color={i % 4 === 0 ? '#9BD9C9' : '#94A3BE'}
            opacity={0.3 + (i % 5) * 0.13}
          />
        ))}
        <Circle cx={257} cy={92} r={62}>
          <LinearGradient
            start={vec(215, 42)}
            end={vec(285, 135)}
            colors={[palette.planet, '#111724']}
          />
        </Circle>
        <Circle cx={240} cy={74} r={13} color="#0B1221" opacity={0.2} />
        <Circle cx={271} cy={109} r={19} color="#0B1221" opacity={0.16} />
        <Oval
          x={159}
          y={77}
          width={201}
          height={37}
          style="stroke"
          strokeWidth={1}
          color="#8294BC"
          opacity={0.35}
          transform={[{ rotate: -0.32 }]}
          origin={vec(257, 92)}
        />
        <Line p1={vec(24, 74)} p2={vec(60, 61)} color="#C7D3E7" opacity={0.2} />
        <Circle cx={61} cy={60} r={1.5} color="#D8E7FD" />
        <Group transform={[{ translateX: 177 }, { translateY: 250 }]}>
          {Array.from({ length: 8 }, (_, order) => {
            const i = 7 - order;
            const tileColor = trailColor(i, 8, palette.trail);
            const x = i < 4 ? -i * 31 : -93 + (i - 3) * 31;
            const y = -i * 16;
            const points = [
              [x, y - 17],
              [x + 30, y],
              [x, y + 17],
              [x - 30, y],
            ];
            return (
              <Group key={i}>
                <Path
                  path={polygon([
                    [x - 30, y],
                    [x, y + 17],
                    [x + 30, y],
                    [x + 30, y + 22],
                    [x, y + 39],
                    [x - 30, y + 22],
                  ])}
                  color={mixHex(tileColor, '#0C192A', 0.72)}
                />
                <Path
                  path={polygon([
                    [x, y + 17],
                    [x + 30, y],
                    [x + 30, y + 22],
                    [x, y + 39],
                  ])}
                  color={mixHex(tileColor, '#0C192A', 0.5)}
                />
                <Line
                  p1={vec(x - 27, y + 16)}
                  p2={vec(x, y + 32)}
                  color={tileColor}
                  strokeWidth={1}
                  opacity={0.65}
                />
                <Line
                  p1={vec(x, y + 32)}
                  p2={vec(x + 27, y + 16)}
                  color={tileColor}
                  strokeWidth={1}
                  opacity={0.65}
                />
                <Path
                  path={polygon(points)}
                  color={mixHex(tileColor, '#172238', i < 3 ? 0.24 : 0.72)}
                />
                <Path
                  path={polygon(points)}
                  style="stroke"
                  strokeWidth={0.9}
                  color={tileColor}
                  opacity={0.7}
                />
              </Group>
            );
          })}
          <Oval
            x={-30}
            y={-14}
            width={60}
            height={34}
            color={palette.color}
            opacity={0.09}
          />
          <Path
            path={polygon([
              [0, -61],
              [24, -47],
              [0, -33],
              [-24, -47],
            ])}
            color="#E2FFC3"
          />
          <Path
            path={polygon([
              [-24, -47],
              [0, -33],
              [0, -5],
              [-24, -19],
            ])}
            color="#7EBF61"
          />
          <Path
            path={polygon([
              [0, -33],
              [24, -47],
              [24, -19],
              [0, -5],
            ])}
            color={palette.color}
          />
          <Path
            path={polygon([
              [0, -61],
              [24, -47],
              [24, -19],
              [0, -5],
              [-24, -19],
              [-24, -47],
            ])}
            color="#E4FFD0"
            style="stroke"
            strokeWidth={1}
          />
        </Group>
      </Group>
    </Canvas>
  );
}
export default memo(SpaceScene);
