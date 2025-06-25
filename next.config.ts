// next.config.ts
import type { NextConfig } from "next";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          // You can specify languages you use to reduce bundle size
          // languages: ['javascript', 'typescript', 'css', 'html', 'json'],
          // features: [] // Disable unneeded features
        })
      );
    }
    return config;
  },
  // Other Next.js configurations
};

export default nextConfig;