import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict Mode double-mounts every WebGL canvas in dev (create, destroy, create again),
  // which makes `npm run dev` noticeably heavier. Production is unaffected either way.
  reactStrictMode: false,
  poweredByHeader: false,
  // three ships ESM source that Next should transpile for the client bundle.
  transpilePackages: ["three"],
};

export default nextConfig;
