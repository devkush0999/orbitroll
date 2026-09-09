import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { imageDeliveryUrl, isCloudinaryUrl } from './media';
import {
  signParameters,
  validateResource,
} from '../supabase/functions/cloudinary-media/policy';
const image = {
  public_id: 'orbit-roll/test',
  resource_type: 'image',
  type: 'upload',
  secure_url:
    'https://res.cloudinary.com/orbit/image/upload/v1/orbit-roll/test.jpg',
  bytes: 1024,
  width: 640,
  height: 360,
  format: 'jpg',
};
test('media metadata must match the reserved provider asset and limits', () => {
  assert.equal(
    validateResource(image, 'image', 'orbit-roll/test', 'orbit').bytes,
    1024,
  );
  for (const patch of [
    { bytes: 2097153 },
    { width: 4097 },
    { format: 'svg' },
    { public_id: 'another/file' },
    { secure_url: 'https://evil.example/image.jpg' },
    { secure_url: 'https://res.cloudinary.com/another/image/upload/test.jpg' },
    { resource_type: 'video' },
  ])
    assert.throws(() =>
      validateResource(
        { ...image, ...patch },
        'image',
        'orbit-roll/test',
        'orbit',
      ),
    );
  const video = {
    ...image,
    resource_type: 'video',
    format: 'mp4',
    duration: 20,
    secure_url:
      'https://res.cloudinary.com/orbit/video/upload/v1/orbit-roll/test.mp4',
  };
  assert.equal(
    validateResource(video, 'video', 'orbit-roll/test', 'orbit').duration,
    20,
  );
  for (const duration of [0, 31, NaN, undefined])
    assert.throws(() =>
      validateResource(
        { ...video, duration },
        'video',
        'orbit-roll/test',
        'orbit',
      ),
    );
});
test('upload signatures are deterministic sorted provider parameters', async () => {
  const parameters = {
    timestamp: '123',
    public_id: 'orbit-roll/test',
    overwrite: 'false',
  };
  const expected = createHash('sha1')
    .update(
      'overwrite=false&public_id=orbit-roll/test&timestamp=123test-secret',
    )
    .digest('hex');
  assert.equal(await signParameters(parameters, 'test-secret'), expected);
});
test('delivery is restricted to Cloudinary and bounded image sizes', () => {
  assert.equal(
    imageDeliveryUrl({ kind: 'image', secure_url: image.secure_url }, 320),
    'https://res.cloudinary.com/orbit/image/upload/f_auto,q_auto,c_limit,w_320/v1/orbit-roll/test.jpg',
  );
  assert.equal(
    imageDeliveryUrl({ kind: 'image', secure_url: 'javascript:alert(1)' }),
    null,
  );
  assert.equal(
    isCloudinaryUrl('https://res.cloudinary.com.evil.example/file'),
    false,
  );
});
