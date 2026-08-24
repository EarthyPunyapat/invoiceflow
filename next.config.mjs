/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit loads AFM font metrics via __dirname-relative fs reads —
  // keep it external so those files resolve from node_modules at runtime.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Baseline security headers on every route. Pages are framed nowhere by
  // design (no embed use case), MIME sniffing is never wanted, referrers
  // leak only the origin, and the app uses no powerful browser features.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
