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
};

export default nextConfig;
