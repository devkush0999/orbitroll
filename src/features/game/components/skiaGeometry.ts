import { Skia } from '@shopify/react-native-skia';
import { project, type Camera, type Point3 } from '../geometry';

export function polygon(
  points: readonly Point3[],
  camera: Camera,
  close = true,
) {
  'worklet';
  const path = Skia.Path.Make();
  points.forEach((point, index) => {
    const p = project(point, camera);
    if (index === 0) path.moveTo(p.x, p.y);
    else path.lineTo(p.x, p.y);
  });
  if (close) path.close();
  return path;
}

export function tileCorners(
  x: number,
  z: number,
  y = 0,
  half = 0.48,
): Point3[] {
  return [
    { x: x - half, y, z: z - half },
    { x: x + half, y, z: z - half },
    { x: x + half, y, z: z + half },
    { x: x - half, y, z: z + half },
  ];
}
