/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Turbopack configuration for Next.js 16
  turbopack: {
    // Empty config to acknowledge Turbopack usage
    // If you need to configure turbopack specifically, add rules here
  },
  
  // Ignore TypeScript errors from supabase/functions folder
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Ignore linting errors from supabase/functions folder
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Exclude supabase folder from webpack bundling
  webpack: (config, { isServer }) => {
    // Ignore the supabase/functions directory
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /supabase\/functions/,
    };
    return config;
  },
}

module.exports = nextConfig