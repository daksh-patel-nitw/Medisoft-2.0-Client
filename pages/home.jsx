import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { getFirstAccessiblePath } from '../utils/sidebarConfig';
import { apis } from '../services/commonServices';
import { decodeToFlags } from '../utils/permissions.util';

// The permission keys that make a user a doctor (PERMISSION_MODULES.D in utils/permissions.util.js).
const DOCTOR_KEYS = new Set(['viewOpdQueue', 'viewAppointmentHistory', 'diagnoseOpd', 'viewLabResults', 'viewIpdQueue', 'diagnoseIpd', 'manageOpdAppointments']);

// Post-login landing page. Login returns no user data, so this is where the
// freshly loaded current user (injected by _app.jsx, `requireLogin` below)
// decides the first page: the first sub-menu page their permission bits allow.
export default function HomePage({ currentUser }) {
  const router = useRouter();
  const firstPath = getFirstAccessiblePath(currentUser?.permissions);
  // A user holding any doctor permission may be a doctor who still has to give their details (degree, college,
  // working times, fees...): that is checked first, once, before sending them to their first page.
  const mayBeDoctor = [...decodeToFlags(currentUser?.permissions)].some((key) => DOCTOR_KEYS.has(key));
  const [checked, setChecked] = useState(!mayBeDoctor);

  useEffect(() => {
    if (!mayBeDoctor) return undefined;
    let cancelled = false;
    (async () => {
      let needsSetup = false;
      try {
        const profile = await apis.getRequest('/users/profile');
        needsSetup = Boolean(profile?.doctor?.needsSetup);
      } catch (error) {
        // already toasted; carry on to the first page
      }
      if (cancelled) return;
      if (needsSetup) router.replace('/doctor/setup');
      else setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [mayBeDoctor, router]);

  useEffect(() => {
    if (checked && firstPath) router.replace(firstPath);
  }, [checked, firstPath, router]);

  if (firstPath || !checked) {
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
