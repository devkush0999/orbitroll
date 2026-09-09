import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseQueue,
  publicUrl,
  validInvite,
  validUsername,
} from './validation';
const run = {
  id: '11111111-1111-4111-8111-111111111111',
  level: 1,
  revision: 1,
  directions: ['east', 'down'],
};
test('queue preserves request identity and validates stored traces', () => {
  assert.deepEqual(parseQueue(JSON.stringify([run])), [run]);
  assert.deepEqual(parseQueue(null), []);
  for (const invalid of [
    { ...run, level: -1 },
    { ...run, directions: ['teleport'] },
    { ...run, directions: Array(513).fill('east') },
    { ...run, revision: 0 },
    { ...run, directions: [] },
  ])
    assert.throws(() => parseQueue(JSON.stringify([invalid])));
  assert.throws(() => parseQueue('broken json'));
});
test('share links only allow configured HTTPS player/invite paths', () => {
  assert.equal(
    publicUrl('https://orbit.example/base', '/player/space_pilot'),
    'https://orbit.example/player/space_pilot',
  );
  assert.equal(
    publicUrl('http://localhost:8081', '/invite/' + 'a'.repeat(32)),
    'http://localhost:8081/invite/' + 'a'.repeat(32),
  );
  for (const origin of [
    undefined,
    'javascript:alert(1)',
    'http://insecure.example',
    'https://user:password@orbit.example',
  ])
    assert.throws(() => publicUrl(origin, '/player/space_pilot'));
  for (const path of [
    '//evil.example',
    '/player/../admin',
    '/invite/short',
    '/player/name?redirect=evil',
  ])
    assert.throws(() => publicUrl('https://orbit.example', path));
});
test('profile and invite route validation rejects malformed identities', () => {
  assert.ok(validUsername('pilot_42'));
  assert.ok(!validUsername('ab'));
  assert.ok(!validUsername('<script>'));
  assert.ok(validInvite('b'.repeat(32)));
  assert.ok(!validInvite('b'.repeat(33)));
});
