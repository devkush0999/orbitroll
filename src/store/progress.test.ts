import assert from 'node:assert/strict';
import test from 'node:test';
import { initialState, parseProgress } from './progress';

test('old saves preserve results and get compatible preference defaults', () => {
  const saved = parseProgress(
    JSON.stringify({
      results: { 1: { stars: 3, moves: 12, seconds: 30 } },
      theme: 'aurora',
    }),
  );
  assert.equal(saved.results[1]?.stars, 3);
  assert.equal(saved.theme, 'aurora');
  assert.equal(saved.controlMode, 'buttons');
  assert.equal(saved.fullscreen, false);
  assert.equal(saved.onboardingComplete, true);
});
test('new installs show the guide while completed onboarding survives relaunch', () => {
  assert.equal(parseProgress('{}').onboardingComplete, false);
  const data = {
    ...initialState,
    onboardingComplete: true,
    fullscreen: true,
    controlMode: 'gestures',
    sensitivity: 'deliberate',
    showHints: false,
  };
  assert.deepEqual(parseProgress(JSON.stringify(data)), data);
});
test('untrusted preference values and invalid level records fall back safely', () => {
  const data = parseProgress(
    JSON.stringify({
      fullscreen: 'yes',
      controlMode: 'unknown',
      sensitivity: 0,
      theme: 'unknown',
      results: {
        999: { stars: 3, moves: 1, seconds: 1 },
        1: { stars: 99, moves: -1, seconds: 0 },
      },
    }),
  );
  assert.deepEqual(data, initialState);
  assert.deepEqual(parseProgress('null'), initialState);
  assert.throws(() => parseProgress('{broken'));
});
