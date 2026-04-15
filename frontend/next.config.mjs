/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { domains: ['api.uazapi.com'] },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001'}/:path*`,
      },
    ]
  },
}

export default nextConfig
