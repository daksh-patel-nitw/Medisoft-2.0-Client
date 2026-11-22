import React from 'react';
import { Card, CardContent, Box } from '@mui/material';
import LockedAccountsTable from '../../components/LockedAccountsTable';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// Patients whose account is locked (too many wrong passwords). The same
// shared card as the admin's locked-employees list, pointed at reception's
// own endpoint: GET / PATCH /reception/lockouts (the PATCH takes just `{ mid }`).
const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'mid', label: 'Patient ID' },
  { key: 'email', label: 'Email' },
];

export default function PatientLockoutsPage() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1000, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          <LockedAccountsTable
            url="/reception/lockouts"
            buildUnlockBody={(mid) => ({ mid })}
            columns={COLUMNS}
            emptyMessage="No locked-out patients."
          />
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
PatientLockoutsPage.layout = 'dashboard';
PatientLockoutsPage.requiredPermissions = PAGE_ACCESS.receptionLockouts;
