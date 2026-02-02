import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isProd && {
    basePath: '/kitaab',
    assetPrefix: '/kitaab',
  }),
};

export default nextConfig;
