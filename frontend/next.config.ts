import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/health/:path*',
        destination: 'http://localhost:8000/health/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:8000/health',
      },
      {
        source: '/ws/:path*',
        destination: 'http://localhost:8000/ws/:path*',
      },
    ]
  },
};

export default nextConfig;
