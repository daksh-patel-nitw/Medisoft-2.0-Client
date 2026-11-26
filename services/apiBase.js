// Where API calls go.
//
// In the BROWSER every call goes to this app's own `/api/...` path, which next.config.js proxies to the
// real API. That makes the login cookie a first-party cookie of this site. Calling the API's own domain
// directly would make it a THIRD-party cookie, which phone browsers (iOS Safari, Chrome with
// third-party cookies blocked) refuse to store - login would "succeed" but no session would stick.
//
// On the Next SERVER (page auth checks, SSR) there is no browser, so it talks to the API directly.
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// The secret that proves a call came from this site (see proxy.js). Only the Next server has it: in the browser this
// is empty, and process.env.PROXY_SHARED_SECRET is never put into the browser bundle (it is not NEXT_PUBLIC_).
export const proxyKeyHeader = () =>
  typeof window === 'undefined' && process.env.PROXY_SHARED_SECRET
    ? { 'x-proxy-key': process.env.PROXY_SHARED_SECRET }
    : {};

export const apiBase = () => (typeof window === 'undefined' ? API_ORIGIN : '/api');
