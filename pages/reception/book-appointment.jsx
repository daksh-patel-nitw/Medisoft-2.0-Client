import React, { useState } from 'react';
import { Card, CardContent, Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PatientFinder from '../../components/PatientFinder';
import AppointmentBooking from '../../components/AppointmentBooking';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// Step 1: find the patient (shared three-box finder) -> Next
// Step 2: the shared booking flow - select doctor, select date, pick a time, book
export default function BookAppointmentPage() {
  const [patient, setPatient] = useState(null);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {patient ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {patient.pname}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {patient.pid} · {patient.mobile}
                  </Typography>
                </Box>
                <Button startIcon={<ArrowBackIcon />} onClick={() => setPatient(null)}>
                  Change patient
                </Button>
              </Box>
              {/* after a booking, go back to the patient search for the next one */}
              <AppointmentBooking patientId={patient.pid} onBooked={() => setPatient(null)} />
            </>
          ) : (
            <PatientFinder onNext={setPatient} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
BookAppointmentPage.layout = 'dashboard';
BookAppointmentPage.requiredPermissions = PAGE_ACCESS.receptionBookAppointment;
