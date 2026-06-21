
import DashboardLayout from '../components/DashboardLayout';
import Router from 'next/router';
import { ToastContainer } from 'react-toastify';
import axios from 'axios';

const AppComponent = ({ Component, pageProps, currentUser }) => {
  const layoutType = Component.layout || 'default';

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
        theme="light"
      />

      {layoutType === 'dashboard' ? (
        <DashboardLayout currentUser={currentUser}>
          <Component currentUser={currentUser} {...pageProps} />
        </DashboardLayout>
      ) : (
        <main style={{ minHeight: '100vh', backgroundColor: '#f4f6f8' }}>
          <Component currentUser={currentUser} {...pageProps} />
        </main>
      )}
    </>
  );
};

AppComponent.getInitialProps = async (appContext) => {
  const allowedRoles = appContext.Component.allowedRoles;
  let currentUser = null;

  if (allowedRoles) {
    try {
      // 1. Determine if we are running on the Server or the Browser
      const isServer = typeof window === 'undefined';
      
      // 2. If on the server, manually grab the cookie from the incoming request
      const headers = isServer && appContext.ctx.req 
        ? { cookie: appContext.ctx.req.headers.cookie || '' } 
        : {};

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      // 3. Make the auth check with the forwarded cookies
      const response = await axios.get(`${apiUrl}/users/currentuser`, {
        headers,
        withCredentials: true
      });

      currentUser = response?.data.data;
      console.log(currentUser,"response", response.data);
      if (currentUser) {
        console.log('Auth Success:', currentUser.name,' User');
      }

    } catch (err) {
      console.log("Auth check failed. User not logged in.");
    }

    // Fallback for client-side navigation right after login.
    if (!currentUser && typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('role');
      if (storedRole) {
        currentUser = {
          role: storedRole,
          name: localStorage.getItem('uname')
        };
      }
    }

    // 4. Handle Unauthorized
    const normalizedUserRole = (currentUser?.role)?.toLowerCase();
    const normalizedAllowedRoles = (allowedRoles || []).map((role) => role);

    if (!currentUser || !normalizedAllowedRoles.includes(normalizedUserRole)) {
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