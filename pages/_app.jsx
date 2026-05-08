
import DashboardLayout from '../components/DashboardLayout';
import Router from 'next/router';
import buildClient from '../services/buildClient'; // We MUST use the SSR client here, not commonServices!
import { ToastContainer, toast } from 'react-toastify';

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

// THE SECURITY GATE (Runs on the Server)
AppComponent.getInitialProps = async (appContext) => {
  /*
  const client = buildClient(appContext.ctx);
  let currentUser = null;

  try {
    // This fetches the user on the server to verify their session
    const { data } = await client.get('/api/users/currentuser');
    currentUser = data.data || data.currentUser; 
  } catch (err) {
    console.log("User not logged in or session expired.");
  }
// -------------------------------------------
  */
  const currentUser = {
    mid: "dev-admin",
    name: "Developer",
    role: "admin",
  };

  const allowedRoles = appContext.Component.allowedRoles;

  if (allowedRoles) {
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {

      if (appContext.ctx.res) {
        appContext.ctx.res.writeHead(302, { Location: '/unauthorized' });
        appContext.ctx.res.end();
      } else {
        Router.push('/unauthorized');
      }

      return { pageProps: {} };
    }
  }

  const client = buildClient(appContext.ctx);

  let pageProps = {};
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(appContext.ctx, client, currentUser);
  }

  return {
    pageProps,
    currentUser
  };
};

export default AppComponent;