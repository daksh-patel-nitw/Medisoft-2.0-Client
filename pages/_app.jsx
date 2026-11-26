
import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import Router from 'next/router';
import { ToastContainer } from 'react-toastify';
import axios from 'axios';
import { hasAccess } from '../utils/permissions.util';
import GlobalProgress from '../components/GlobalProgress';
import AppFooter from '../components/AppFooter';
import { apiBase } from '../services/apiBase';

// GET /users/currentuser with whatever cookies the caller can send.
const fetchCurrentUser = async (headers = {}) => {
  const response = await axios.get(`${apiBase()}/users/currentuser`, { headers, withCredentials: true });
  return response?.data?.data ?? null;
};

const AppComponent = ({ Component, pageProps, currentUser: serverUser, authPending }) => {
  const layoutType = Component.layout || 'default';
  const [browserUser, setBrowserUser] = useState(null);

  // On a full page load (refresh, typed URL) the check below runs on the Next server, which only
  // sees the login cookie when the browser sent it to the Next host. When the API lives on another
  // domain the cookie belongs to the API's domain only, so the server cannot see it - it must not
  // read that as "logged out". It sets `authPending` instead and the BROWSER, which does send the
  // cookie to the API, makes the check here.
  useEffect(() => {
    if (!authPending) return undefined;
    let cancelled = false;
    (async () => {
      let user = null;
      try {
        user = await fetchCurrentUser();
      } catch (err) {
        // not logged in
      }
      if (cancelled) return;
      const required = Component.requiredPermissions;
      if (!user || (required && !hasAccess(user.permissions, required))) {
        Router.replace('/unauthorized');
      } else {
        setBrowserUser(user);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authPending, Component]);

  const currentUser = authPending ? browserUser : serverUser;

  // Fire-and-forget heartbeat, the first thing any page does on load: wakes
  // a sleeping Render instance early so the real request that follows
  // (login, etc.) isn't the one eating the cold-start delay. Deliberately a
  // raw axios call, not the shared `apis` client - a failed ping (expected
  // mid-wake-up) must stay silent, not surface the usual network-error toast.
  useEffect(() => {
    axios.get(`${apiBase()}/public/ping`).catch(() => {});
  }, []);

  if (authPending && !browserUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <GlobalProgress />
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
        theme="light"
        // Wider on laptop/desktop screens (react-toastify defaults to 320px); on phones
        // its own media query still makes the toast full width.
        // Min height is also lowered (default 64px) so short messages get a slimmer toast.
        style={{ '--toastify-toast-width': 'min(560px, 92vw)', '--toastify-toast-min-height': '44px' }}
      />

      {layoutType === 'dashboard' ? (
        <DashboardLayout currentUser={currentUser}>
          <Component currentUser={currentUser} {...pageProps} />
        </DashboardLayout>
      ) : (
        // Page on top, footer strip at the end - login, the public landing page, etc.
        // One screen tall: the footer is always visible at the bottom and the
        // page scrolls inside <main> only when it is taller than the space left.
        <div style={{ height: '100dvh', backgroundColor: '#f4f6f8', display: 'flex', flexDirection: 'column' }}>
          <main style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Component currentUser={currentUser} {...pageProps} />
          </main>
          <AppFooter />
        </div>
      )}
    </>
  );
};

AppComponent.getInitialProps = async (appContext) => {
  // Per-module bit strings the page needs, e.g. { A: '10000000001000' } -
  // see utils/pageAccess.js. A page that sets this requires login + those bits.
  const requiredPermissions = appContext.Component.requiredPermissions;
  // `requireLogin` = needs a logged-in user but no particular permission bits
  // (e.g. the post-login landing page).
  const requireLogin = appContext.Component.requireLogin;
  let currentUser = null;

  if (requiredPermissions || requireLogin) {
    try {
      // 1. Determine if we are running on the Server or the Browser
      const isServer = typeof window === 'undefined';

      // 2. If on the server, manually grab the cookie from the incoming request
      const cookie = isServer ? appContext.ctx.req?.headers.cookie || '' : '';

      if (isServer && !cookie) {
        // No cookie reached the Next server - that does not mean "logged out" (see AppComponent): let the browser check.
        return { pageProps: {}, currentUser: null, authPending: true };
      }

      // 3. Make the auth check with the forwarded cookies
      // On the Next server this call comes from the host, not the visitor, so the API would see the
      // host's address for every visitor (shared rate limit, wrong audit IP). Pass the visitor's address on.
      const forwardedFor = isServer ? appContext.ctx.req?.headers['x-forwarded-for'] : undefined;
      currentUser = await fetchCurrentUser(isServer ? { cookie, ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}) } : {});
      if (currentUser) {
        console.log('Auth Success:', currentUser.name, ' User');
      }

    } catch (err) {
      console.log("Auth check failed. User not logged in.");
    }

    // 4. Handle Unauthorized
    // (user & page) === page for every module the page names. UX gate only -
    // the API re-checks the same bits on every request.
    if (!currentUser || (requiredPermissions && !hasAccess(currentUser.permissions, requiredPermissions))) {
      if (appContext.ctx.res) {
        // Server-side redirect
        appContext.ctx.res.writeHead(302, { Location: '/unauthorized' });
        appContext.ctx.res.end();
      } else {
        // Client-side redirect
        Router.push('/unauthorized');
      }
      // Return early so the page doesn't try to load
      return { pageProps: {}, currentUser: null }; 
    }
  }

  // 5. Load individual page props
  let pageProps = {};
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(appContext.ctx);
  }

  return {
    pageProps,
    currentUser
  };
};

export default AppComponent;