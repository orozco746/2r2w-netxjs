import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
      return [
          {
              source: "/:path*",
              headers: [
                  {
                      key: "Cross-Origin-Opener-Policy",
                      value: "unsafe-none",
                  },
              ],
          },
      ];
  },
};

export default nextConfig;
