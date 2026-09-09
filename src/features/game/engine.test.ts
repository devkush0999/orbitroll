import assert from 'node:assert/strict';
import test from 'node:test';
import {
  directionBetween,
  getStars,
  initialGame,
  moveCube,
  planMove,
  availableDirections,
  sameCell,
} from './engine';
import { getNextLevel, levels } from './levels';
import type { Cell, Direction, Level } from './types';
import { tileVisibility, trailFrame, TRAIL_AHEAD } from './visibility';
import { rollCenter, rotatePoint, trailColor } from './geometry';

for (const level of levels) {
  test(`level ${level.id}: connected, unique trail can be completed with all crystals`, () => {
    assert.equal(
      new Set(level.path.map((p) => `${p.x},${p.y},${p.z}`)).size,
      level.path.length,
    );
    assert.equal(new Set(level.gems).size, 3);
    let state = initialGame(level);
    for (let index = 1; index < level.path.length; index++) {
      const direction = directionBetween(state.position, level.path[index]!);
      assert.ok(direction, `Tile ${index} must be adjacent`);
      state = moveCube(state, direction, level);
      assert.equal(
        state.status,
        index === level.path.length - 1 ? 'won' : 'playing',
      );
    }
    assert.equal(state.moves, level.path.length - 1);
    assert.equal(state.collected.length, 3);
    assert.equal(getStars(state.moves, state.collected.length, level), 3);
    assert.equal(state.furthest, level.path.length - 1);
    assert.equal(state.visited.length, level.path.length);
    assert.equal(moveCube(state, 'north', level), state);
  });
}
test('leaving the path causes a fall; fallen and paused cubes cannot move', () => {
  const level = levels[0]!;
  const start = initialGame(level);
  const fallen = moveCube(start, 'south', level);
  assert.equal(fallen.status, 'falling');
  assert.equal(fallen.moves, 1);
  assert.deepEqual(fallen.visited, [0]);
  assert.equal(moveCube(fallen, 'north', level), fallen);
  const paused = { ...start, status: 'paused' as const };
  assert.equal(moveCube(paused, 'north', level), paused);
});
test('backtracking does not duplicate crystals or decrease distance', () => {
  const level = levels[0]!;
  let state = initialGame(level);
  const gemIndex = level.gems[0]!;
  for (let i = 1; i <= gemIndex; i++)
    state = moveCube(
      state,
      directionBetween(state.position, level.path[i]!)!,
      level,
    );
  assert.equal(state.collected.length, 1);
  const previous = level.path[gemIndex - 1]!;
  state = moveCube(state, directionBetween(state.position, previous)!, level);
  assert.equal(state.furthest, gemIndex);
  state = moveCube(
    state,
    directionBetween(state.position, level.path[gemIndex]!)!,
    level,
  );
  assert.equal(state.collected.length, 1);
  assert.ok(sameCell(state.position, level.path[gemIndex]!));
  assert.deepEqual(
    state.visited,
    Array.from({ length: gemIndex + 1 }, (_, i) => i),
  );
});
test('only orthogonally adjacent cells have a direction', () => {
  assert.equal(
    directionBetween({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }),
    undefined,
  );
  const expected: Direction[] = ['north', 'east', 'south', 'west'];
  assert.deepEqual(
    [
      { x: 0, z: -1 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -1, z: 0 },
    ].map((p) => directionBetween({ x: 0, y: 0, z: 0 }, { ...p, y: 0 })),
    expected,
  );
});

test('3D rolls hold the leading ground edge stationary in all four directions', () => {
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    for (const progress of [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1]) {
      const center = rollCenter(0, 0, dx, dz, progress);
      const edge = rotatePoint(
        { x: dx * 0.5, y: -0.5, z: dz * 0.5 },
        dx,
        dz,
        (progress * Math.PI) / 2,
      );
      assert.ok(Math.abs(edge.x + center.x - dx * 0.5) < 1e-10);
      assert.ok(Math.abs(edge.z + center.z - dz * 0.5) < 1e-10);
      assert.ok(Math.abs(edge.y + center.y) < 1e-10);
      for (const x of [-0.5, 0.5])
        for (const y of [-0.5, 0.5])
          for (const z of [-0.5, 0.5]) {
            const vertex = rotatePoint(
              { x, y, z },
              dx,
              dz,
              (progress * Math.PI) / 2,
            );
            assert.ok(
              vertex.y + center.y >= -1e-10,
              'Cube must never sink through a tile',
            );
          }
    }
  }
});
test('cube lands centered on the adjacent tile and rises at mid-roll', () => {
  const start = rollCenter(2, -3, 1, 0, 0);
  const end = rollCenter(2, -3, 1, 0, 1);
  assert.deepEqual(start, { x: 2, y: 0.5, z: -3 });
  assert.equal(end.x, 3);
  assert.equal(end.z, -3);
  assert.ok(Math.abs(end.y - 0.5) < 1e-10);
  assert.ok(Math.abs(rollCenter(0, 0, 1, 0, 0.5).y - Math.SQRT1_2) < 1e-10);
});
test('trail gradient is bounded and smoothly interpolates between colors', () => {
  const palette = ['#000000', '#ffffff'];
  assert.equal(trailColor(0, 3, palette), '#000000');
  assert.equal(trailColor(1, 3, palette), '#808080');
  assert.equal(trailColor(2, 3, palette), '#ffffff');
  assert.equal(trailColor(100, 3, palette), '#ffffff');
});
test('retry resets all illuminated trail tiles', () => {
  const level = levels[0]!;
  const moved = moveCube(initialGame(level), 'north', level);
  assert.deepEqual(moved.visited, [0, 1]);
  assert.deepEqual(initialGame(level).visited, [0]);
});

function fixture(path: Cell[], lifts: Level['lifts'] = []): Level {
  return {
    id: 99,
    name: 'Physics fixture',
    sector: 'TEST',
    description: '',
    path,
    lifts,
    gems: [1, 2],
  };
}
test('a broken edge lands on the highest platform below, regardless of path order', () => {
  const level = fixture([
    { x: 0, y: 6, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 3, z: -1 },
    { x: 1, y: 0, z: -1 },
  ]);
  const plan = planMove(initialGame(level), 'north', level);
  assert.equal(plan.kind, 'drop');
  assert.equal(plan.targetIndex, 2);
  assert.equal(plan.next.position.y, 3);
  assert.equal(plan.next.status, 'playing');
  assert.deepEqual(plan.next.visited, [0, 2]);
  assert.deepEqual(plan.next.collected, [2]);
  assert.equal(plan.next.moves, 1);
});
test('rolling continues from the lower deck after a landing', () => {
  const level = fixture([
    { x: 0, y: 4, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: -1, y: 0, z: -1 },
  ]);
  const landed = moveCube(initialGame(level), 'north', level);
  assert.equal(landed.status, 'playing');
  const finished = moveCube(landed, 'west', level);
  assert.equal(finished.status, 'won');
  assert.equal(finished.position.y, 0);
  assert.equal(finished.moves, 2);
});
test('gravity cannot pull the cube sideways onto a non-aligned platform', () => {
  const level = fixture([
    { x: 0, y: 4, z: 0 },
    { x: 0, y: 0, z: -2 },
  ]);
  const plan = planMove(initialGame(level), 'north', level);
  assert.equal(plan.kind, 'miss');
  assert.equal(plan.next.status, 'falling');
  assert.deepEqual(plan.next.collected, []);
});
test('lift pads move up and down only through explicit connections', () => {
  const level = fixture(
    [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 3, z: 0 },
      { x: 0, y: 3, z: -1 },
    ],
    [{ from: 0, to: 1 }],
  );
  const start = initialGame(level);
  assert.ok(availableDirections(start, level).includes('up'));
  const up = planMove(start, 'up', level);
  assert.equal(up.kind, 'lift');
  assert.equal(up.next.position.y, 3);
  const down = planMove(up.next, 'down', level);
  assert.equal(down.kind, 'lift');
  assert.equal(down.next.position.y, 0);
  assert.deepEqual(down.next.collected, [1]);
  assert.equal(planMove(start, 'down', level).next, start);
  assert.equal(planMove(start, 'up', { ...level, lifts: [] }).next, start);
});
test('the cube cannot pass through a raised block or a low ceiling', () => {
  for (const y of [1, 1.5, 1.8]) {
    const level = fixture([
      { x: 0, y: 0, z: 0 },
      { x: 0, y, z: -1 },
      { x: 0, y: -3, z: -1 },
    ]);
    const start = initialGame(level);
    assert.equal(planMove(start, 'north', level).kind, 'blocked');
    assert.equal(moveCube(start, 'north', level), start);
  }
});
test('elevation distinguishes stacked tiles and a retry restores the starting altitude', () => {
  assert.equal(sameCell({ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }), false);
  const level = levels[6]!;
  assert.equal(initialGame(level).position.y, 6);
  assert.deepEqual(initialGame(level).visited, [0]);
});

test('progressive reveal shows only the nearby trail and restores it when backtracking', () => {
  const level = levels[0]!;
  assert.equal(tileVisibility(level, 0, 0), 1);
  assert.ok(tileVisibility(level, 0, TRAIL_AHEAD) > 0);
  assert.equal(tileVisibility(level, 0, TRAIL_AHEAD + 1), 0);
  assert.equal(tileVisibility(level, 6, 0), 0);
  assert.equal(tileVisibility(level, 1, 0), 0.38);
  assert.equal(tileVisibility(level, 6, 6), 1);
});

test('the next landing stays visible before a drop and the old upper deck fades afterward', () => {
  const level = levels[6]!;
  const destination = level.path.findIndex(
    (p, i) => i > 0 && p.y < level.path[i - 1]!.y,
  );
  assert.equal(tileVisibility(level, destination - 1, destination), 0.85);
  assert.equal(tileVisibility(level, destination, destination - 1), 0.08);
  assert.equal(tileVisibility(level, destination, destination), 1);
});

test('local camera frames include the active tile and all preview tiles on every deck', () => {
  for (const level of levels) {
    for (let current = 0; current < level.path.length; current++) {
      for (const [width, height] of [
        [342, 420],
        [272, 150],
      ]) {
        const frame = trailFrame(level, current, current, width!, height!);
        assert.ok(Number.isFinite(frame.unit) && frame.unit > 0);
        for (
          let i = current;
          i <= Math.min(current + TRAIL_AHEAD, level.path.length - 1);
          i++
        ) {
          const cell = level.path[i]!;
          const px = (cell.x - cell.z - frame.x) * frame.unit + width! / 2;
          const py =
            ((cell.x + cell.z) * 0.62 - cell.y - frame.y) * frame.unit +
            height! / 2 +
            8;
          assert.ok(
            px >= 0 && px <= width!,
            `Level ${level.id}: tile outside horizontal frame`,
          );
          assert.ok(
            py >= 0 && py <= height!,
            `Level ${level.id}: tile outside vertical frame`,
          );
        }
      }
    }
  }
});

test('after a drop the camera fits the lower trail without the departed deck', () => {
  const level = fixture([
    { x: 0, y: 8, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: -1, y: 0, z: -1 },
    { x: -2, y: 0, z: -1 },
  ]);
  const before = trailFrame(level, 0, 0, 342, 420);
  const after = trailFrame(level, 1, 1, 342, 420);
  assert.ok(after.unit > before.unit);
  assert.ok(after.y > before.y);
});

test('every completed level leads to a fresh next trail and the final level ends the sequence', () => {
  for (let index = 0; index < levels.length - 1; index++) {
    const next = getNextLevel(levels[index]!.id);
    assert.equal(next, levels[index + 1]);
    const start = initialGame(next!);
    assert.equal(start.status, 'playing');
    assert.equal(start.moves, 0);
    assert.deepEqual(start.collected, []);
    assert.deepEqual(start.position, next!.path[0]);
  }
  assert.equal(getNextLevel(levels[levels.length - 1]!.id), undefined);
  assert.equal(getNextLevel(-1), undefined);
});
