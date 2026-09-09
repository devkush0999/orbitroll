import assert from 'node:assert/strict';
import test from 'node:test';
import { swipeDirection, swipeThreshold } from './input';

test('diagonal swipes match all four projected roll directions', () => {
  assert.equal(swipeDirection(-60, -40, 30, []), 'west');
  assert.equal(swipeDirection(60, -40, 30, []), 'north');
  assert.equal(swipeDirection(-60, 40, 30, []), 'south');
  assert.equal(swipeDirection(60, 40, 30, []), 'east');
});
test('vertical swipes use only available lifts and never fall through to rolling', () => {
  assert.equal(swipeDirection(5, -80, 30, ['up']), 'up');
  assert.equal(swipeDirection(-5, 80, 30, ['down']), 'down');
  assert.equal(swipeDirection(5, -80, 30, ['down']), null);
  assert.equal(swipeDirection(0, 80, 30, ['north']), null);
});
test('sensitivity rejects short, ambiguous, and invalid strokes', () => {
  assert.equal(swipeDirection(20, 15, swipeThreshold.light, []), 'east');
  assert.equal(swipeDirection(20, 15, swipeThreshold.balanced, []), null);
  assert.equal(swipeDirection(30, 20, swipeThreshold.deliberate, []), null);
  assert.equal(swipeDirection(100, 2, 30, []), null);
  assert.equal(swipeDirection(NaN, 40, 30, []), null);
  assert.equal(swipeDirection(20, Infinity, 30, []), null);
});
