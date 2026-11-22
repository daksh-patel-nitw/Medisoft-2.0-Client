import React from 'react';
import { Box, Typography } from '@mui/material';
import QueueBoard from '../../components/QueueBoard';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// The queue board for the signed-in user's own department.
export default function QueueScreenPage({ currentUser }) {
  const dep = currentUser?.dep;

  if (!dep) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="text.secondary" align="center">
          Your account has no department, so there is no queue to show.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      <QueueBoard dep={dep} />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
QueueScreenPage.layout = 'dashboard';
QueueScreenPage.requiredPermissions = PAGE_ACCESS.receptionQueue;
