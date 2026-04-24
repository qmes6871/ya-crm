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

  // Allow iframe embedding from yasolu.com
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://yasolu.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
