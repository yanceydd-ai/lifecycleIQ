/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lifecycleiq/shared'],
  // 'standalone' is for Docker deployments only; Vercel handles its own output optimization
  ...(process.env.DOCKER_BUILD === 'true' ? { output: 'standalone' } : {}),
};

export default nextConfig;
