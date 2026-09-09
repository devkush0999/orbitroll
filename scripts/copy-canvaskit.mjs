import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
mkdirSync('public', { recursive: true });
for (const [source, destination] of [
  ['canvaskit-wasm/bin/full/canvaskit.wasm', 'canvaskit.wasm'],
  [
    '@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm',
    'dotlottie-player.wasm',
  ],
]) {
  copyFileSync(require.resolve(source), `public/${destination}`);
}
