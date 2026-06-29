import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    // Turbopack is already used in dev; no extra runtime flags needed for stable builds
  },
};

export default nextConfig;
