/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lifecycleiq/shared'],
  output: 'standalone',
};

export default nextConfig;
