import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apis } from '../../services/commonServices';
import AppointmentDetails from '../../components/AppointmentDetails';
import PrescriptionPanel from '../../components/PrescriptionPanel';
import { PAGE_ACCESS } from '../../utils/pageAccess';
import { formatDate } from '../../utils/prescription.util';

export default function DoctorIpdPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  // bumped after a prescription is saved: the form restarts blank and "prescribed so far" re-reads
  const [version, setVersion] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, patients: [] });

  // GET /doctor/getIPD -> this doctor's admitted patients: [{ _id (the appointment), pid, pname, createdAt, notes }]
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let patients = null;
      try {
        patients = (await apis.getRequest('/doctor/getIPD')) ?? [];
      } catch (error) {
        // already toasted; keep the last good list
      }
      if (!cancelled) setResult((prev) => ({ key: reloadKey, patients: patients ?? prev.patients }));
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const loading = result.key !== reloadKey;
  const patients = result.patients;
  const load = () => setReloadKey((k) => k + 1);

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return patients;
    return patients.filter((p) => p.pname?.toLowerCase().includes(text) || p.pid?.toLowerCase().includes(text));
  }, [patients, search]);

  const selected = patients.find((p) => p._id === selectedId) ?? null;

  if (result.key === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={2} alignItems="flex-start">
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="h6">IPD patients ({patients.length})</Typography>
              <Button size="small" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
                Refresh
              </Button>
            </Stack>
            <TextField fullWidth size="small" label="Search by name or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
            {visible.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                {patients.length === 0 ? 'No IPD patients assigned to you.' : 'No patients match.'}
              </Typography>
            ) : (
              <List dense sx={{ mt: 1, maxHeight: '60vh', overflowY: 'auto' }}>
                {visible.map((p) => (
                  <ListItemButton key={p._id} selected={p._id === selectedId} onClick={() => setSelectedId(p._id)}>
                    <ListItemText primary={p.pname} secondary={`${p.pid} · admitted ${formatDate(p.createdAt)}`} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        {!selected ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 6 }}>
            Select a patient to prescribe medicines and lab tests.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Typography variant="h5" fontWeight="bold">
                  {selected.pname}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selected.pid}
                </Typography>
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Prescribed so far
                  </Typography>
                  <AppointmentDetails aid={selected._id} reloadKey={version} />
                </Box>
              </CardContent>
            </Card>

            {/* keyed so switching patient, or saving, starts a blank form */}
            <PrescriptionPanel
              key={`${selected._id}-${version}`}
              aid={selected._id}
              endpoint="/doctor/diagnoseIPD"
              initialNotes={selected.notes ?? ''}
              submitLabel="Save prescription"
              onDone={() => {
                setVersion((v) => v + 1);
                load();
              }}
            />
          </Stack>
        )}
      </Grid>
    </Grid>
  );
}

// NEXT.JS SECURITY GATE
DoctorIpdPage.layout = 'dashboard';
DoctorIpdPage.requiredPermissions = PAGE_ACCESS.doctorIpd;
