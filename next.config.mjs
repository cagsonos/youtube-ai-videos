/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["xlsx", "@libsql/client", "@prisma/adapter-libsql"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
    ],
  },
};

export default nextConfig;
