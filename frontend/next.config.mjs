/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.API_URL || 'http://campaign-backend:3000';
    return [
      // Rota mais específica PRIMEIRO (uploads)
      {
        source: '/api/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      // Rota geral depois
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
