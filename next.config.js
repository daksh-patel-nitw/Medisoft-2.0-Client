const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the dev server's HMR websocket and dev-only font loader be reached
  // when previewing `npm run dev` from another device on the LAN (e.g.
  // 10.225.21.107), not just from localhost.
  allowedDevOrigins: ['10.225.21.107'],

  // The browser calls /api/* on this site and Next forwards it to the real API (see services/apiBase.js
  // for why): the session cookie then belongs to this site instead of being a third-party cookie.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/:path*` }];
  },
};

module.exports = nextConfig;
