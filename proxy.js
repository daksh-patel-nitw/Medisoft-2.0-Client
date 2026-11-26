import { NextResponse } from 'next/server';

// Adds the shared secret to every call this site forwards to the API (see rewrites in next.config.js),
// so the API can refuse anything that did not come through this site. The value is read on the server only
// (it is not a NEXT_PUBLIC_ variable), so it never reaches the browser. Without PROXY_SHARED_SECRET this
// does nothing except drop any x-proxy-key a visitor tried to send themselves.
export function proxy(request) {
  const headers = new Headers(request.headers);
  headers.delete('x-proxy-key');
  const secret = process.env.PROXY_SHARED_SECRET;
  if (secret) headers.set('x-proxy-key', secret);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: '/api/:path*',
};
