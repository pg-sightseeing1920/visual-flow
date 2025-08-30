import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Konva関連のサーバーサイドでの問題を回避
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('canvas');
    }
    
    return config;
  },
};

export default nextConfig;
