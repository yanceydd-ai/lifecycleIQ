import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lifecycleiq/shared'],
  output: 'standalone',
};

export default nextConfig;
