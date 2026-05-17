import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép HMR/dev resources từ LAN host khác (test cross-device).
  // Thêm IP cụ thể vào đây nếu cần. Production không bị ảnh hưởng.
  allowedDevOrigins: [
    '192.168.111.175',
    '192.168.*',   // toàn bộ dải 192.168.*.*
    '10.*',        // dải 10.*
    '172.16.*', '172.17.*', '172.18.*', '172.19.*',
    '172.20.*', '172.21.*', '172.22.*', '172.23.*',
    '172.24.*', '172.25.*', '172.26.*', '172.27.*',
    '172.28.*', '172.29.*', '172.30.*', '172.31.*',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
  },
};

export default nextConfig;
