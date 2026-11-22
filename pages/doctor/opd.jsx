import React, { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apis } from '../../services/commonServices';
import AppointmentDetails from '../../components/AppointmentDetails';
import PrescriptionPanel from '../../components/PrescriptionPanel';
import { PAGE_ACCESS } from '../../utils/pageAccess';
import { formatDate } from '../../utils/prescription.util';

const formatDay = (value) => (value ? new Date(value).toLocaleDateString([], { dateStyle: 'long' }) : '-');

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <Typography variant="body2">
      <b>{label}:</b> {value}
    </Typography>
  );
}

/** The patient being seen: vitals, what the patient reported, and what the reception asked. */
function PatientCard({ appointment }) {
  const questions = appointment.selected_doctor_qs ?? [];
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" fontWeight="bold">
          {appointment.pname}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {appointment.pid} · booked for {formatDate(appointment.schedule_date)}
        </Typography>
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          <Fact label="Height" value={appointment.height ? `${appointment.height} cm` : ''} />
          <Fact label="Weight" value={appointment.weight ? `${appointment.weight} kg` : ''} />
          <Fact label="Allergy" value={appointment.allergy} />
          <Fact label="Medical conditions" value={appointment.conditions} />
          <Fact label="Others" value={appointment.others} />
        </Stack>
        {questions.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Patient answered yes to
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {questions.map((q) => (
                <Chip key={q} size="small" color="secondary" label={q} />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/** Earlier visits of this patient; each one loads its prescriptions only when opened. */
function PastAppointments({ items }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Previous appointments
        </Typography>
        {items.length === 0 ? (
          <Typography color="text.secondary">No previous appointments.</Typography>
        ) : (
          items.map((past) => (
            <Accordion key={past.aid} disableGutters variant="outlined" slotProps={{ transition: { unmountOnExit: true } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="bold">{formatDay(past.date)}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <AppointmentDetails aid={past.aid} />
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function DoctorOpdPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, appointment: null });

  // The server returns the visit already on this doctor's screen, or claims the next waiting one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let appointment = null;
      let failed = false;
      try {
        appointment = (await apis.getRequest('/doctor/getOPD')) ?? null;
      } catch (error) {
        failed = true; // already toasted; keep showing the current patient
      }
      if (!cancelled) setResult((prev) => ({ key: reloadKey, appointment: failed ? prev.appointment : appointment }));
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const loading = result.key !== reloadKey;
  const appointment = result.appointment;
  const loadNext = () => setReloadKey((k) => k + 1);

  if (result.key === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (appointment === null) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ mt: 8 }}>
        <Typography variant="h5">No patients waiting</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadNext} disabled={loading}>
          Check again
        </Button>
      </Stack>
    );
  }

  return (
    <Grid container spacing={2} alignItems="flex-start">
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={2}>
          <PatientCard appointment={appointment} />
          <PastAppointments items={appointment.patientpastapp ?? []} />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        {/* keyed by appointment so the form starts blank for every patient */}
        <PrescriptionPanel
          key={appointment._id}
          aid={appointment._id}
          endpoint="/doctor/diagnoseOPD"
          submitLabel="Finish & next patient"
          allowEmpty
          onDone={loadNext}
        />
      </Grid>
    </Grid>
  );
}

// NEXT.JS SECURITY GATE
DoctorOpdPage.layout = 'dashboard';
DoctorOpdPage.requiredPermissions = PAGE_ACCESS.doctorOpd;
