import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: process.env.ASSETNOTE_PREVIEW === "1" ? ".next-preview" : ".next",
  transpilePackages: ["@workspace/ui"],
}

export default nextConfig
