import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/yacrm",

  // Enable server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
