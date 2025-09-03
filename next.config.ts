import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Konva.jsのSSR問題を回避
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      }
    }
    return config
  },
  
  // デプロイ時のESLintエラーを無効化
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScriptエラーの詳細表示
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig;