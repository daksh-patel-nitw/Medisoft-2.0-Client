import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { getFirstAccessiblePath } from '../utils/sidebarConfig';

// Post-login landing page. Login returns no user data, so this is where the
// freshly loaded current user (injected by _app.jsx, `requireLogin` below)
// decides the first page: the first sub-menu page their permission bits allow.
export default function HomePage({ currentUser }) {
  const router = useRouter();
  const firstPath = getFirstAccessiblePath(currentUser?.permissions);

  useEffect(() => {
    if (firstPath) router.replace(firstPath);
  }, [firstPath, router]);

  if (firstPath) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box textAlign="center" mt={10}>
      <Typography variant="h6">No pages are assigned to your role yet.</Typography>
      <Typography variant="body2" color="textSecondary">Contact the administrator.</Typography>
    </Box>
  );
}

HomePage.layout = 'dashboard';
HomePage.requireLogin = true;
