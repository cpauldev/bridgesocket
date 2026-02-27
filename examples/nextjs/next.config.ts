import demo from "demo";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["example-ui", "universa-ui"],
};

export default demo.next(nextConfig);
