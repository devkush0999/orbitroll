import assert from 'node:assert/strict';
import test from 'node:test';
import { initialGame, moveCube, planMove } from '../game/engine';
import { lessons } from './lessons';
import { levels } from '../game/levels';

for (const lesson of lessons) {
  test(`${lesson.title} practice instructions lead to the portal`, () => {
    let state = initialGame(lesson.level);
    for (const direction of lesson.steps)
      state = moveCube(state, direction, lesson.level);
    assert.equal(state.status, 'won');
    assert.equal(state.collected.length, lesson.level.gems.length);
    assert.ok(!levels.some((level) => level.id === lesson.level.id));
  });
}
test('the lift lesson lets players descend again before leaving the pad', () => {
  const level = lessons[1]!.level;
  const up = moveCube(initialGame(level), 'up', level);
  const down = planMove(up, 'down', level);
  assert.equal(down.kind, 'lift');
  assert.deepEqual(down.next.position, level.path[0]);
});
test('the drop lesson teaches an actual gravity landing before continuing', () => {
  const level = lessons[2]!.level;
  const drop = planMove(initialGame(level), 'north', level);
  assert.equal(drop.kind, 'drop');
  assert.equal(drop.next.status, 'playing');
  assert.equal(drop.next.position.y, 0);
});
