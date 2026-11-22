import React from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { apis } from '../../services/commonServices';
import AppointmentBooking from '../../components/AppointmentBooking';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// The patient's own booking calls. A module constant on purpose: the shared flow re-reads the
// doctor list whenever this object changes. The patient id is never sent from here - the
// server takes it from the signed-in user.
const patientBookingApi = {
  getDoctors: async () => (await apis.getRequest('/patient/doctors'))?.doctors ?? [],
  getTimings: (did, dateIso) => apis.postReadRequest('/patient/doctorTimings', { did, date: dateIso }),
  book: ({ did, schedule_date, userTimezone }) => apis.postRequest('/patient/appointment', { did, schedule_date, userTimezone }),
};

export default function PatientBookAppointmentPage({ currentUser }) {
  const router = useRouter();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Book an appointment
          </Typography>
          {/* the consultation fee is billed once booked, so continue to the bills page to pay it */}
          <AppointmentBooking patientId={currentUser?.mid} api={patientBookingApi} onBooked={() => router.push('/patient/bills')} />
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
PatientBookAppointmentPage.layout = 'dashboard';
PatientBookAppointmentPage.requiredPermissions = PAGE_ACCESS.patientBookAppointment;
