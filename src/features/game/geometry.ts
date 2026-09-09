export type Point3 = { x: number; y: number; z: number };
export type Camera = { unit: number; x: number; y: number };
export const CAMERA_TILT = 0.62;

export function project(point: Point3, camera: Camera) {
  'worklet';
  return {
    x: camera.x + (point.x - point.z) * camera.unit,
    y: camera.y + ((point.x + point.z) * CAMERA_TILT - point.y) * camera.unit,
  };
}

export function rotatePoint(
  point: Point3,
  dx: number,
  dz: number,
  angle: number,
): Point3 {
  'worklet';
  const along = point.x * dx + point.z * dz;
  const sin = Math.sin(angle),
    cos = Math.cos(angle);
  return {
    x: point.x + dx * (along * (cos - 1) + point.y * sin),
    z: point.z + dz * (along * (cos - 1) + point.y * sin),
    y: point.y * cos - along * sin,
  };
}

// Rotate a unit cube around its leading ground edge, keeping that edge stationary.
export function rollCenter(
  fromX: number,
  fromZ: number,
  dx: number,
  dz: number,
  progress: number,
): Point3 {
  'worklet';
  const angle = (progress * Math.PI) / 2;
  const sin = Math.sin(angle),
    cos = Math.cos(angle);
  const travel = 0.5 + 0.5 * (sin - cos);
  return {
    x: fromX + dx * travel,
    z: fromZ + dz * travel,
    y: dx === 0 && dz === 0 ? 0.5 : 0.5 * (sin + cos),
  };
}

export function mixHex(from: string, to: string, progress: number): string {
  'worklet';
  const a = parseInt(from.slice(1), 16),
    b = parseInt(to.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(
      ((a >> shift) & 255) +
        (((b >> shift) & 255) - ((a >> shift) & 255)) * progress,
    );
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

export function trailColor(
  index: number,
  count: number,
  palette: readonly string[],
): string {
  const position =
    Math.max(0, Math.min(1, index / Math.max(1, count - 1))) *
    (palette.length - 1);
  const start = Math.floor(position);
  return mixHex(
    palette[start]!,
    palette[Math.min(start + 1, palette.length - 1)]!,
    position - start,
  );
}
