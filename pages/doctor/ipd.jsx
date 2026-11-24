import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, List, ListItemButton, ListItemText, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apis } from '../../services/commonServices';
import IpdHistory from '../../components/IpdHistory';
import PrescriptionPanel from '../../components/PrescriptionPanel';
import useRefreshStore from '../../store/useRefreshStore';
import { PAGE_ACCESS } from '../../utils/pageAccess';
import { formatDate } from '../../utils/prescription.util';

const TAB_LIST = 'list';
const TAB_PATIENT = 'patient';

export default function DoctorIpdPage() {
  const [tab, setTab] = useState(TAB_LIST);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  // bumped after a prescription is saved: the form restarts blank and the history re-reads
  const [version, setVersion] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, patients: [] });

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);
  const readKey = `${reloadKey}|${refreshTick}`;

  // GET /doctor/getIPD -> this doctor's admitted patients: [{ _id (the appointment), pid, pname, createdAt }]
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let patients = null;
      try {
        patients = (await apis.getRequest('/doctor/getIPD')) ?? [];
      } catch (error) {
        // already toasted; keep the last good list
      }
      if (!cancelled) setResult((prev) => ({ key: readKey, patients: patients ?? prev.patients }));
      finishRefresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [readKey, finishRefresh]);

  const loading = result.key !== readKey;
  const patients = result.patients;
  const selected = patients.find((p) => p._id === selectedId) ?? null;

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return patients;
    return patients.filter((p) => p.pname?.toLowerCase().includes(text) || p.pid?.toLowerCase().includes(text));
  }, [patients, search]);

  const openPatient = (id) => {
    setSelectedId(id);
    setVersion((v) => v + 1);
    setTab(TAB_PATIENT);
  };

  if (result.key === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  // the patient's tab only exists once one has been chosen
  const activeTab = tab === TAB_PATIENT && selected ? TAB_PATIENT : TAB_LIST;

  return (
    <Box>
      <Tabs value={activeTab} onChange={(e, next) => setTab(next)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value={TAB_LIST} label="IPD patients" />
        {selected && <Tab value={TAB_PATIENT} label={selected.pname} />}
      </Tabs>

      {activeTab === TAB_LIST ? (
        // 1. the list, only at first - pick the patient to work on
        <Card sx={{ maxWidth: 760, mx: 'auto' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="h6">IPD patients ({patients.length})</Typography>
              <Button size="small" startIcon={<RefreshIcon />} onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
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
                  <ListItemButton key={p._id} onClick={() => openPatient(p._id)}>
                    <ListItemText primary={p.pname} secondary={`${p.pid} · admitted ${formatDate(p.createdAt)}`} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      ) : (
        // 2. the patient: the stay's history on the left, adding medicines / labs / a note on the right
        <Grid container spacing={2} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" fontWeight="bold">
                  {selected.pname}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selected.pid} · admitted {formatDate(selected.createdAt)}
                </Typography>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  History
                </Typography>
                <Box sx={{ maxHeight: '70vh', overflowY: 'auto', pr: 0.5 }}>
                  <IpdHistory aid={selected._id} reloadKey={version} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            {/* keyed so switching patient, or saving, starts a blank form */}
            <PrescriptionPanel
              key={`${selected._id}-${version}`}
              aid={selected._id}
              endpoint="/doctor/diagnoseIPD"
              notesLabel="Add a note"
              submitLabel="Save prescription"
              onDone={() => setVersion((v) => v + 1)}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

// NEXT.JS SECURITY GATE
DoctorIpdPage.layout = 'dashboard';
DoctorIpdPage.requiredPermissions = PAGE_ACCESS.doctorIpd;
