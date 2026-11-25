import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Pagination,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { PAGE_ACCESS } from '../../utils/pageAccess';
import { decodeMedicineTimes, formatDate } from '../../utils/prescription.util';

// LabStatus on the server. Only a DONE (D) test has a report to download.
const LAB_STATUS = {
  P: { label: 'Waiting for payment', color: 'warning' },
  B: { label: 'Paid - sample not taken yet', color: 'info' },
  T: { label: 'Sample taken - report pending', color: 'info' },
  D: { label: 'Report ready', color: 'success' },
  C: { label: 'Cancelled', color: 'error' },
};

/** Saves a response body that arrived as a Blob under the given file name. */
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function LabRow({ lab }) {
  const [downloading, setDownloading] = useState(false);
  const status = LAB_STATUS[lab.status] ?? { label: lab.status, color: 'default' };

  // GET /patient/lab-report/:id - the server only serves the report of one of this patient's own, finished tests
  const download = async () => {
    setDownloading(true);
    try {
      const blob = await apis.downloadRequest(`/patient/lab-report/${lab._id}`);
      saveBlob(blob, `${lab.tname.replace(/[^a-z0-9]+/gi, '_')}_report.pdf`);
    } catch (error) {
      // already toasted by the http client
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
      <Typography variant="body2" fontWeight="bold">
        {lab.tname}
      </Typography>
      {lab.status === 'D' ? (
        <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={downloading}>
          {downloading ? 'Downloading...' : 'Download report'}
        </Button>
      ) : (
        <Chip size="small" color={status.color} variant="outlined" label={status.label} />
      )}
    </Stack>
  );
}

/** One appointment's medicines and lab tests - read when the accordion is opened (it only mounts then). */
function AppointmentPrescriptions({ aid }) {
  const [result, setResult] = useState({ aid: null, data: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = await apis.postReadRequest('/patient/prescriptions', { aid });
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) setResult({ aid, data });
    })();
    return () => {
      cancelled = true;
    };
  }, [aid]);

  if (result.aid !== aid) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (!result.data) return <Typography color="text.secondary">Could not load this appointment.</Typography>;

  const { medicines = [], labs = [] } = result.data;
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Medicines
        </Typography>
        {medicines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None prescribed.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {medicines.map((m) => (
              <Box key={m._id} sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2" fontWeight="bold">
                  {m.mname}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {decodeMedicineTimes(m.time).map((t) => (
                    <Chip key={t} size="small" label={t} />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Lab tests
        </Typography>
        {labs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None prescribed.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {labs.map((lab) => (
              <LabRow key={lab._id} lab={lab} />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

// Where an appointment stands (AppointmentStatus on the server). Upcoming ones are in the history too.
const APPOINTMENT_STATUS = {
  P: { label: 'Booked - not paid yet', color: 'warning' },
  B: { label: 'Paid - waiting', color: 'info' },
  I: { label: 'In the queue', color: 'info' },
  D: { label: 'With the doctor', color: 'primary' },
  Done: { label: 'Seen', color: 'success' },
  C: { label: 'Cancelled', color: 'error' },
  IPD: { label: 'Inpatient', color: 'primary' },
};

const TYPES = { opd: 'Outpatient (OPD)', ipd: 'Inpatient (IPD)' };

/**
 * POST /patient/appointments/history { type, page } -> { appointments: [{ aid, dname, schedule_date, status }], totalPages, currentPage }
 * The API returns them newest first, 10 per page.
 */
function AppointmentList({ type }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ key: null, appointments: [], totalPages: 0 });
  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);
  const key = `${type}|${page}|${refreshTick}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = await apis.postReadRequest('/patient/appointments/history', { type, page: String(page) });
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) setResult((prev) => ({ key, appointments: data?.appointments ?? prev.appointments, totalPages: data?.totalPages ?? prev.totalPages }));
      finishRefresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [type, page, key, finishRefresh]);

  if (result.key !== key && result.key === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ opacity: result.key === key ? 1 : 0.5 }}>
      {result.appointments.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          No appointments yet.
        </Typography>
      ) : (
        result.appointments.map((a) => (
          <Accordion key={a.aid} disableGutters variant="outlined" slotProps={{ transition: { unmountOnExit: true } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', width: '100%', pr: 1 }}>
                <Box>
                  <Typography fontWeight="bold">{formatDate(a.schedule_date)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dr. {a.dname}
                  </Typography>
                </Box>
                {a.status && (
                  <Chip
                    size="small"
                    color={APPOINTMENT_STATUS[a.status]?.color ?? 'default'}
                    variant={a.status === 'C' ? 'outlined' : 'filled'}
                    label={APPOINTMENT_STATUS[a.status]?.label ?? a.status}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <AppointmentPrescriptions aid={a.aid} />
            </AccordionDetails>
          </Accordion>
        ))
      )}
      {result.totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination count={result.totalPages} page={page} onChange={(e, next) => setPage(next)} />
        </Stack>
      )}
    </Box>
  );
}

export default function PatientAppointmentsPage() {
  const [type, setType] = useState('opd');

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3 }}>
        <Tabs value={type} onChange={(e, next) => setType(next)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {Object.entries(TYPES).map(([value, label]) => (
            <Tab key={value} value={value} label={label} />
          ))}
        </Tabs>
        <CardContent>
          {/* keyed by type so each tab starts on page 1 */}
          <AppointmentList key={type} type={type} />
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
PatientAppointmentsPage.layout = 'dashboard';
PatientAppointmentsPage.requiredPermissions = PAGE_ACCESS.patientAppointments;
