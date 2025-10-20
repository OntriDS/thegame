/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Avoid eval in development by using non-eval source maps on the client */
  webpack: (config, { dev, isServer }) => {
    // Only override devtool in production builds
    if (!dev) {
      config.devtool = isServer ? false : 'source-map';
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
