import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler (stable in Next 16) — auto-memoizes components.
  // Requires the `babel-plugin-react-compiler` dev dependency.
  reactCompiler: true,

  // Allow <Image> to load media served by the backend (dev: Django/MinIO, prod:
  // the deployed API host). Set NEXT_PUBLIC_MEDIA_HOST in production.
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      ...(process.env.NEXT_PUBLIC_MEDIA_HOST
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.NEXT_PUBLIC_MEDIA_HOST,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
