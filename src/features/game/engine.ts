import { vectors } from './levels';
import type { Cell, Direction, GameState, Level } from './types';

export const sameCell = (a: Cell, b: Cell) =>
  a.x === b.x && a.y === b.y && a.z === b.z;
export const initialGame = (level: Level): GameState => ({
  position: level.path[0]!,
  moves: 0,
  collected: [],
  visited: [0],
  furthest: 0,
  status: 'playing',
});
export type MoveKind = 'roll' | 'drop' | 'lift' | 'miss' | 'blocked';
export type MovePlan = { kind: MoveKind; next: GameState; targetIndex: number };

function land(state: GameState, index: number, level: Level): GameState {
  return {
    position: level.path[index]!,
    moves: state.moves + 1,
    collected:
      level.gems.includes(index) && !state.collected.includes(index)
        ? [...state.collected, index]
        : state.collected,
    visited: state.visited.includes(index)
      ? state.visited
      : [...state.visited, index],
    furthest: Math.max(state.furthest, index),
    status: index === level.path.length - 1 ? 'won' : 'playing',
  };
}

/** Resolve gravity against the highest platform below the cube, not path order. */
export function planMove(
  state: GameState,
  direction: Direction,
  level: Level,
): MovePlan {
  const blocked: MovePlan = { kind: 'blocked', next: state, targetIndex: -1 };
  if (state.status !== 'playing') return blocked;
  const position = state.position;
  if (direction === 'up' || direction === 'down') {
    const current = level.path.findIndex((cell) => sameCell(cell, position));
    const destinations = level.lifts.flatMap((lift) =>
      lift.from === current
        ? [lift.to]
        : lift.to === current
          ? [lift.from]
          : [],
    );
    const target = destinations
      .filter((index) =>
        direction === 'up'
          ? level.path[index]!.y > position.y
          : level.path[index]!.y < position.y,
      )
      .sort(
        (a, b) =>
          Math.abs(level.path[a]!.y - position.y) -
          Math.abs(level.path[b]!.y - position.y),
      )[0];
    return target === undefined
      ? blocked
      : { kind: 'lift', next: land(state, target, level), targetIndex: target };
  }
  const vector = vectors[direction];
  const target = {
    x: position.x + vector.x,
    y: position.y,
    z: position.z + vector.z,
  };
  const column = level.path
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell.x === target.x && cell.z === target.z);
  // A cube cannot roll through the solid side of a higher platform or a low ceiling.
  if (
    column.some(
      ({ cell }) =>
        cell.y > position.y && cell.y - 0.56 < position.y + Math.SQRT2,
    )
  )
    return blocked;
  const landing = column
    .filter(({ cell }) => cell.y <= position.y)
    .sort((a, b) => b.cell.y - a.cell.y)[0];
  if (!landing)
    return {
      kind: 'miss',
      targetIndex: -1,
      next: {
        ...state,
        position: target,
        moves: state.moves + 1,
        status: 'falling',
      },
    };
  return {
    kind: landing.cell.y < position.y ? 'drop' : 'roll',
    next: land(state, landing.index, level),
    targetIndex: landing.index,
  };
}
export const moveCube = (
  state: GameState,
  direction: Direction,
  level: Level,
) => planMove(state, direction, level).next;
export const availableDirections = (state: GameState, level: Level) =>
  (Object.keys(vectors) as Direction[]).filter((direction) => {
    const kind = planMove(state, direction, level).kind;
    return kind !== 'blocked' && kind !== 'miss';
  });
export function getStars(
  moves: number,
  gemCount: number,
  level: Level,
): number {
  if (gemCount === level.gems.length && moves <= level.path.length + 2)
    return 3;
  return gemCount >= 2 ? 2 : 1;
}
export function directionBetween(from: Cell, to: Cell): Direction | undefined {
  if (from.x === to.x && from.z === to.z && from.y !== to.y)
    return to.y > from.y ? 'up' : 'down';
  return (['north', 'east', 'south', 'west'] as const).find((direction) => {
    const delta = vectors[direction];
    return from.x + delta.x === to.x && from.z + delta.z === to.z;
  });
}
