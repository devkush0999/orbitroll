import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  basePath: process.env.ADMIN_BASE_PATH ?? '',
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};
export default config;
