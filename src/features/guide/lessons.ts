import type { Direction, Level } from '../game/types';

export type Lesson = {
  id: 'roll' | 'lift' | 'drop' | 'portal';
  title: string;
  heading: string;
  description: string;
  instruction: string;
  success: string;
  steps: readonly Direction[];
  level: Level;
};
const base = {
  sector: 'FLIGHT SCHOOL',
  description: 'Practice only',
  gems: [],
  lifts: [],
};
export const lessons: readonly Lesson[] = [
  {
    id: 'roll',
    title: 'Roll',
    heading: 'One swipe. One small step.',
    description:
      'Swipe diagonally toward the next tile. Your cube turns 90° and the trail builds ahead. Each completed swipe makes one move.',
    instruction: 'Swipe ↗ twice, then ↖ once to reach the portal.',
    success: 'You have the rhythm. Every diagonal swipe is one roll.',
    steps: ['north', 'north', 'west'],
    level: {
      ...base,
      id: -1,
      name: 'First rolls',
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: -1 },
        { x: 0, y: 0, z: -2 },
        { x: -1, y: 0, z: -2 },
      ],
    },
  },
  {
    id: 'lift',
    title: 'Lift',
    heading: 'A different kind of up.',
    description:
      'Cyan rings connect decks. Swipe straight ↑ to rise or ↓ to descend on a connected lift. A vertical swipe anywhere else does nothing.',
    instruction:
      'Swipe ↑ on this cyan pad, then ↗ to the portal. You can try ↓ before leaving the upper pad.',
    success:
      'Lift mastered. Straight swipes change decks; diagonal swipes roll.',
    steps: ['up', 'north'],
    level: {
      ...base,
      id: -2,
      name: 'Cyan elevator',
      lifts: [{ from: 0, to: 1 }],
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 3, z: 0 },
        { x: 0, y: 3, z: -1 },
      ],
    },
  },
  {
    id: 'drop',
    title: 'Drop',
    heading: 'Trust the golden arrow.',
    description:
      'Gold arrows mark a broken edge with a landing below. Roll in the arrow’s direction and gravity catches you on the aligned platform. No jump button needed.',
    instruction:
      'Swipe ↗ off the gold edge, wait for the landing, then ↖ to continue.',
    success: 'Perfect landing. You can keep rolling on the lower deck.',
    steps: ['north', 'west'],
    level: {
      ...base,
      id: -3,
      name: 'Safe descent',
      path: [
        { x: 0, y: 4, z: 0 },
        { x: 0, y: 0, z: -1 },
        { x: -1, y: 0, z: -1 },
      ],
    },
  },
  {
    id: 'portal',
    title: 'Finish',
    heading: 'Bring the stardust home.',
    description:
      'Collect crystals and reach the glowing portal. In a real level, earn three stars by collecting all three crystals with no more than three extra rolls beyond the authored trail.',
    instruction:
      'Swipe ↗ three times. Collect every crystal and enter the portal.',
    success: 'Ready for orbit. Take these moves into your first real level.',
    steps: ['north', 'north', 'north'],
    level: {
      ...base,
      id: -4,
      name: 'Portal approach',
      gems: [1, 2, 3],
      path: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: -1 },
        { x: 0, y: 0, z: -2 },
        { x: 0, y: 0, z: -3 },
      ],
    },
  },
];
