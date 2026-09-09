import { Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { interpolateColor, useDerivedValue } from 'react-native-reanimated';
import {
  CAMERA_TILT,
  project,
  rollCenter,
  rotatePoint,
  type Camera,
  type Point3,
} from '../geometry';
import { polygon } from './skiaGeometry';
import type { BoardProps } from './GameBoardCore';

const vertices: Point3[] = [
  { x: -0.5, y: -0.5, z: -0.5 },
  { x: 0.5, y: -0.5, z: -0.5 },
  { x: 0.5, y: -0.5, z: 0.5 },
  { x: -0.5, y: -0.5, z: 0.5 },
  { x: -0.5, y: 0.5, z: -0.5 },
  { x: 0.5, y: 0.5, z: -0.5 },
  { x: 0.5, y: 0.5, z: 0.5 },
  { x: -0.5, y: 0.5, z: 0.5 },
];
const faces = [
  { corners: [4, 5, 6, 7], normal: { x: 0, y: 1, z: 0 } },
  { corners: [0, 1, 2, 3], normal: { x: 0, y: -1, z: 0 } },
  { corners: [1, 5, 6, 2], normal: { x: 1, y: 0, z: 0 } },
  { corners: [0, 4, 7, 3], normal: { x: -1, y: 0, z: 0 } },
  { corners: [3, 2, 6, 7], normal: { x: 0, y: 0, z: 1 } },
  { corners: [0, 1, 5, 4], normal: { x: 0, y: 0, z: -1 } },
];
type CubeProps = BoardProps & { camera: Camera; trailColors: string[] };

function CubeFace({
  face,
  camera,
  trailColors,
  ...props
}: CubeProps & { face: (typeof faces)[number] }) {
  const frame = useDerivedValue(() => {
    const angle = (props.progress.value * Math.PI) / 2;
    const dx = props.dx.value,
      dz = props.dz.value;
    const center = rollCenter(
      props.fromX.value,
      props.fromZ.value,
      dx,
      dz,
      props.progress.value,
    );
    center.y += props.elevation.value - props.fall.value * 8;
    const normal = rotatePoint(face.normal, dx, dz, angle);
    const points = face.corners.map((index) => {
      const p = rotatePoint(vertices[index]!, dx, dz, angle);
      return { x: p.x + center.x, y: p.y + center.y, z: p.z + center.z };
    });
    return {
      points,
      normal,
      visible: normal.x + normal.y / CAMERA_TILT + normal.z > 0.001,
    };
  });
  const path = useDerivedValue(() =>
    frame.value.visible
      ? polygon(frame.value.points, camera)
      : Skia.Path.Make(),
  );
  const inset = useDerivedValue(() => {
    if (!frame.value.visible) return Skia.Path.Make();
    const points = frame.value.points;
    const middle = points.reduce(
      (sum, p) => ({
        x: sum.x + p.x / 4,
        y: sum.y + p.y / 4,
        z: sum.z + p.z / 4,
      }),
      { x: 0, y: 0, z: 0 },
    );
    return polygon(
      points.map((p) => ({
        x: middle.x + (p.x - middle.x) * 0.7,
        y: middle.y + (p.y - middle.y) * 0.7,
        z: middle.z + (p.z - middle.z) * 0.7,
      })),
      camera,
    );
  });
  const color = useDerivedValue(() => {
    const from = props.sourceIndex.value;
    const to = props.targetIndex.value;
    const startY = props.level.path[from]!.y;
    const endY = props.level.path[to]!.y;
    const hueProgress =
      startY === endY
        ? props.progress.value
        : Math.min(
            1,
            Math.abs((props.elevation.value - startY) / (endY - startY)),
          );
    const hue = interpolateColor(
      hueProgress,
      [0, 1],
      [trailColors[Math.max(0, from)]!, trailColors[Math.max(0, to)]!],
    );
    const n = frame.value.normal;
    const light = Math.max(
      0.13,
      Math.min(1, 0.3 + n.x * 0.26 + n.y * 0.7 + n.z * 0.05),
    );
    return interpolateColor(light, [0, 0.55, 1], ['#122D3F', hue, '#F3FFF0']);
  });
  const opacity = useDerivedValue(() => 1 - props.fall.value);
  return (
    <Group opacity={opacity}>
      <Path path={path} color={color} />
      <Path
        path={path}
        color="#F0FFF3"
        style="stroke"
        strokeWidth={1.15}
        opacity={0.8}
        strokeJoin="round"
      />
      <Path
        path={inset}
        color="#FFFFFF"
        style="stroke"
        strokeWidth={0.8}
        opacity={0.3}
        strokeJoin="round"
      />
    </Group>
  );
}

export default function Cube3D(props: CubeProps) {
  const shadowTransform = useDerivedValue(() => {
    const center = rollCenter(
      props.fromX.value,
      props.fromZ.value,
      props.dx.value,
      props.dz.value,
      props.progress.value,
    );
    const ground = project(
      { ...center, y: props.groundY.value + 0.01 },
      props.camera,
    );
    return [
      { translateX: ground.x },
      { translateY: ground.y },
      { scale: 1 - (center.y - 0.5) * 0.6 },
    ];
  });
  const shadowOpacity = useDerivedValue(
    () =>
      ((1 - props.fall.value) * 0.3) /
      (1 + Math.abs(props.elevation.value - props.groundY.value)),
  );
  return (
    <Group>
      <Group transform={shadowTransform} opacity={shadowOpacity}>
        <Oval
          x={-props.camera.unit * 0.75}
          y={-props.camera.unit * 0.4}
          width={props.camera.unit * 1.5}
          height={props.camera.unit * 0.8}
          color="#02070E"
        />
      </Group>
      {faces.map((face, index) => (
        <CubeFace key={index} {...props} face={face} />
      ))}
    </Group>
  );
}
