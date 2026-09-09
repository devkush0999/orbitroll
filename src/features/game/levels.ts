import type { Cell, Direction, Level } from './types';

export const vectors: Record<Direction, Cell> = {
  north: { x: 0, y: 0, z: -1 },
  east: { x: 1, y: 0, z: 0 },
  south: { x: 0, y: 0, z: 1 },
  west: { x: -1, y: 0, z: 0 },
  up: { x: 0, y: 3, z: 0 },
  down: { x: 0, y: -3, z: 0 },
};
function makePath(directions: string, startY = 0) {
  const path: Cell[] = [{ x: 0, y: startY, z: 0 }];
  const lifts: { from: number; to: number }[] = [];
  const lookup: Record<string, Direction> = {
    N: 'north',
    E: 'east',
    S: 'south',
    W: 'west',
    U: 'up',
    D: 'down',
  };
  const steps = directions.match(/[NESWUD](?:@-?\d+(?:\.\d+)?)?/g) ?? [];
  if (steps.join('') !== directions.replace(/\s+/g, ''))
    throw new Error(`Invalid level script: ${directions}`);
  for (const step of steps) {
    const [letter, altitude] = step.split('@');
    const direction = lookup[letter!];
    if (!direction) throw new Error(`Invalid level direction ${step}`);
    const previous = path[path.length - 1]!;
    const delta = vectors[direction];
    path.push({
      x: previous.x + delta.x,
      y: altitude === undefined ? previous.y + delta.y : Number(altitude),
      z: previous.z + delta.z,
    });
    if (direction === 'up' || direction === 'down')
      lifts.push({ from: path.length - 2, to: path.length - 1 });
  }
  return { path, lifts };
}
const definitions = [
  [
    'First light',
    'THE OUTER RIM',
    'Every great journey starts with a little roll.',
    'NNNWWWNNNWW',
  ],
  [
    'Lunar bend',
    'THE OUTER RIM',
    'Find your rhythm around the moon.',
    'WWNNNWWNNNEENN',
  ],
  [
    'Satellite run',
    'THE OUTER RIM',
    'A winding trail above the atmosphere.',
    'NNNWWSSSWWNNNWWNN',
  ],
  [
    'Aurora lane',
    'THE NEBULA',
    'Keep your balance in the afterglow.',
    'NNNEEENNNWWWNNWW',
  ],
  [
    'Stardust way',
    'THE NEBULA',
    'Follow the crystals through the silence.',
    'WWWNNNEEENNNWWWNNN',
  ],
  [
    'Event horizon',
    'THE NEBULA',
    'The longest way home is the most beautiful.',
    'NNNWWWSSSWWNNNNNEEENN',
  ],
  [
    'First descent',
    'GRAVITY SCHOOL',
    'Follow the gold edge. The next path waits below.',
    'NNN N@0 WWW NN',
    6,
  ],
  [
    'Sky elevator',
    'GRAVITY SCHOOL',
    'Cyan pads take you up. Gold edges bring you down.',
    'NN U WW NN N@0 WW',
    0,
  ],
  [
    'Gravity well',
    'GRAVITY SCHOOL',
    'Three decks. Two drops. One way home.',
    'NN WW N@3 NN WW N@0 NN',
    6,
  ],
  [
    'Upward bound',
    'THE SKYWAYS',
    'Ride two lifts into the upper atmosphere.',
    'NN U WW NN U WW NN',
    0,
  ],
  [
    'Broken orbit',
    'THE SKYWAYS',
    'The bridge ends. Your journey does not.',
    'NNN WW N@2 WW NN W@-1 NN',
    5,
  ],
  [
    'Return current',
    'THE SKYWAYS',
    'Climb the lift, then find the lower crossing.',
    'WW U NN EE D NN WW',
    0,
  ],
  [
    'Cloud staircase',
    'THE CASCADE',
    'A chain of landings through open space.',
    'NN N@6 WW W@3 NN N@0 WW',
    9,
  ],
  [
    'Split horizon',
    'THE CASCADE',
    'Descend, climb, and discover another route.',
    'NN W@0 WW U NN WW N@0',
    4,
  ],
  [
    'Underpass',
    'THE CASCADE',
    'A new path below a familiar sky.',
    'NN WW SS E@0 EE NN WW NN',
    4,
  ],
  [
    'Celestial tower',
    'DEEP EXPEDITIONS',
    'Find the highest deck, then trust the landing.',
    'NN U WW U NN W@3 WW N@0 NN',
    0,
  ],
  [
    'Freefall relay',
    'DEEP EXPEDITIONS',
    'Every broken edge leads to another beginning.',
    'NN W@5 WW N@2 NN E@-1 EE NN',
    8,
  ],
  [
    'The long way home',
    'DEEP EXPEDITIONS',
    'One final journey across every dimension.',
    'NN U WW NN U WW N@3 NN WW D NN',
    0,
  ],
] as const;
export const levels: readonly Level[] = definitions.map(
  ([name, sector, description, steps, startY], index) => {
    const { path, lifts } = makePath(steps, startY);
    return {
      id: index + 1,
      name,
      sector,
      description,
      path,
      lifts,
      gems: [
        Math.floor(path.length * 0.25),
        Math.floor(path.length * 0.5),
        Math.floor(path.length * 0.75),
      ],
    };
  },
);
export const getLevel = (id: number) => levels.find((level) => level.id === id);
export const getNextLevel = (id: number) => {
  const index = levels.findIndex((level) => level.id === id);
  return index < 0 ? undefined : levels[index + 1];
};
export const VERTICAL_ENTRY_LEVEL = 7;
export const getDropCount = (level: Level) =>
  level.path.filter(
    (cell, index) =>
      index > 0 &&
      cell.y < level.path[index - 1]!.y &&
      (cell.x !== level.path[index - 1]!.x ||
        cell.z !== level.path[index - 1]!.z),
  ).length;
