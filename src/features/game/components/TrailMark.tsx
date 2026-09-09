import { memo, useMemo } from 'react';
import { View } from 'react-native';
import type { Level } from '../types';
import { CAMERA_TILT } from '../geometry';

/** A small route signature gives each level a recognizable shape in the trail list. */
export const TrailMark = memo(function TrailMark({
  level,
  color,
}: {
  level: Level;
  color: string;
}) {
  const points = useMemo(() => {
    const raw = level.path.map((p) => ({
      x: p.x - p.z,
      y: (p.x + p.z) * CAMERA_TILT - p.y,
    }));
    const xs = raw.map((p) => p.x),
      ys = raw.map((p) => p.y);
    const minX = Math.min(...xs),
      minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX,
      spanY = Math.max(...ys) - minY;
    const unit = Math.min(48 / Math.max(spanX, 1), 36 / Math.max(spanY, 1));
    return raw.map((p) => ({
      x: (p.x - minX) * unit + (64 - spanX * unit) / 2,
      y: (p.y - minY) * unit + (52 - spanY * unit) / 2,
    }));
  }, [level]);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width: 64, height: 52 }}
    >
      {points.slice(1).map((to, index) => {
        const from = points[index]!;
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: (from.x + to.x) / 2 - length / 2,
              top: (from.y + to.y) / 2 - 1,
              width: length,
              height: 2,
              borderRadius: 1,
              backgroundColor: color,
              opacity: 0.6,
              transform: [
                { rotate: `${Math.atan2(to.y - from.y, to.x - from.x)}rad` },
              ],
            }}
          />
        );
      })}
      {[points[0]!, points[points.length - 1]!].map((p, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: p.x - 3,
            top: p.y - 3,
            width: 6,
            height: 6,
            borderRadius: index ? 3 : 1,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
});
