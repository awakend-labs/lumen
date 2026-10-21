import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["radix-ui"],
  },
};

export default async function config(phase: string): Promise<NextConfig> {
  const configuration = { ...nextConfig };
  if (process.env.LUMEN_PERFORMANCE_RUN === "1") {
    const bundler = process.env.LUMEN_PERFORMANCE_BUNDLER;
    if (bundler !== "webpack" && bundler !== "turbopack") throw new Error("Choose a supported benchmark bundler");
    configuration.distDir = `.next-performance/${phase === PHASE_DEVELOPMENT_SERVER ? "dev" : "build"}-${bundler}`;
  }
  if (phase === PHASE_DEVELOPMENT_SERVER && process.env.LUMEN_CF_DEV === "1") {
    const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
    await initOpenNextCloudflareForDev();
  }
  return configuration;
}
