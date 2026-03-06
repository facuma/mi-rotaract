import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mi-rotaract/shared-types'],
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mi-rotaract/shared-types': path.resolve(__dirname, '../../packages/shared-types/dist/index.js'),
    };
    return config;
  },
};

export default nextConfig;
