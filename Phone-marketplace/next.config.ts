import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    viewTransition: true,
  },
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.chotot.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.chotot.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.-imgcdn.kuototot.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.carousell.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.facebook.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.zalo.me",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.otoshop.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
