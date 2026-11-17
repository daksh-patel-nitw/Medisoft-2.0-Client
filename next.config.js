/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the dev server's HMR websocket and dev-only font loader be reached
  // when previewing `npm run dev` from another device on the LAN (e.g.
  // 10.225.21.107), not just from localhost.
  allowedDevOrigins: ['10.225.21.107'],
};

module.exports = nextConfig;
