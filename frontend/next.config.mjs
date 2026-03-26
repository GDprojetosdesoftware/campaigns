/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy all /api/* requests to the backend container (or NEXT_PUBLIC_API_URL if defined)
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://campaign-backend:3000'}/:path*`,
      },
      {
        source: '/api/uploads/:path*',
        destination: `${process.env.API_URL || 'http://campaign-backend:3000'}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
