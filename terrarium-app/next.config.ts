import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Mateo",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
