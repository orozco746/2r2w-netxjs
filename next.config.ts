/**
 * @file next.config.ts
 * @description Configuration file for Next.js.
 * Includes settings for headers, strict mode, and other Next.js specific options.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /**
   * Configure custom HTTP headers.
   * @returns {Promise<Array<{source: string, headers: Array<{key: string, value: string}>}>>}
   */
  async headers() {
      return [
          {
              // Apply these headers to all routes
              source: "/:path*",
              headers: [
                  {
                      key: "Cross-Origin-Opener-Policy",
                      value: "unsafe-none", // Required for some cross-origin isolations or popup interactions
                  },
              ],
          },
      ];
  },
};

export default nextConfig;
