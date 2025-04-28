/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from specific remote domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        // Add your Supabase project URL hostname here
        hostname: 'gfvkrnhhfaeqmualbnrh.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/figures/**',
      },
      // Add any other domains you might use for images
    ],
  },
};

export default nextConfig;
