import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
const source = 'apps/admin/out';
if (!existsSync('dist/index.html') || !existsSync(`${source}/index.html`))
  throw new Error('Export Expo and the Next.js admin first.');
if (!readFileSync(`${source}/index.html`, 'utf8').includes('/admin/_next/'))
  throw new Error('Build the shared preview with ADMIN_BASE_PATH=/admin.');
mkdirSync('dist/admin', { recursive: true });
cpSync(source, 'dist/admin', { recursive: true });
console.log(
  'Combined static site ready: Expo website at /; Next.js admin at /admin/.',
);
