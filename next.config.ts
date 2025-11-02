import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "firebasestorage.googleapis.com", protocol: "https" },
    ]
  },
};

export default nextConfig;
