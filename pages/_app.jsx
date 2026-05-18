
import DashboardLayout from '../components/DashboardLayout';
import Router from 'next/router';
import { ToastContainer, toast } from 'react-toastify';
import { apis } from '../services/commonServices';

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
  // 1. Check if the page even requires authentication FIRST!
  const allowedRoles = appContext.Component.allowedRoles;

  let currentUser = null;

  // 2. ONLY call the backend if the page is restricted (e.g., Dashboard pages)
  if (allowedRoles) {
    try {
      const data = await apis.getRequest('/users/currentuser');
      currentUser = data.user;
    } catch (err) {
      console.log(err);
      console.log("Auth check failed. User not logged in.");
    }

    // 3. Security Check: Do they exist and have the right role?
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      if (appContext.ctx.res) {
        // Redirect to unauthorized (or login) on the server side
        appContext.ctx.res.writeHead(302, { Location: '/unauthorized' });
        appContext.ctx.res.end();
      } else {
        // Redirect on the client side
        Router.push('/unauthorized');
      }
      return { pageProps: {} }; // Stop executing
    }
  }

  // 4. Run the individual page's getInitialProps (if it has one)
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