import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Since all pages are under /crm, we don't need basePath
  // The app structure handles the /crm prefix naturally

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
