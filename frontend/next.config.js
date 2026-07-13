/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone mode: รวม Node.js dependencies ไว้ใน .next/standalone
  // จำเป็นสำหรับ Docker multi-stage build
  output: 'standalone',
};

module.exports = nextConfig;
