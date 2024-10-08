/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //     appDir: true
  // },
  async rewrites() {
    return [{
      source: '/auth/login',
      destination: '/app/login'
    },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
      };
    }
    return config;
  }
}

module.exports = nextConfig
