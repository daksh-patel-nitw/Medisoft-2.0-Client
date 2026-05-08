// pages/unauthorized.jsx
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, Button, Container } from '@mui/material';
import GppBadIcon from '@mui/icons-material/GppBad';

const UnauthorizedPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the home page after 3 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);

    // Cleanup timer if the user clicks the button before 3 seconds
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          mt: 10, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center' 
        }}
      >
        <GppBadIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Access Denied
        </Typography>
        <Typography color="text.secondary" paragraph>
          You do not have the required permissions to view this page. 
          Redirecting you to the safe zone in a few seconds...
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => router.push('/')}
          sx={{ mt: 2 }}
        >
          Return to Home Now
        </Button>
      </Box>
    </Container>
  );
};

// Hide navigation for this error page
UnauthorizedPage.hideHeader = true;
UnauthorizedPage.hideFooter = true;

export default UnauthorizedPage;