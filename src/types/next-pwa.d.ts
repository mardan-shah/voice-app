declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PwaPluginOptions = Record<string, unknown>;

  export default function createPWA(
    options?: PwaPluginOptions
  ): (config: NextConfig) => NextConfig;
}
