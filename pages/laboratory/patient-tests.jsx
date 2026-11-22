import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Tabs, Tab, Box, Button, Typography, TextField, Chip, Skeleton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { toast } from 'react-toastify';
import { apis } from '../../services/commonServices';
import { decodeToFlags } from '../../utils/permissions.util';
import PatientFinder from '../../components/PatientFinder';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// Lab prescription status codes (LabStatus on the server).
const STATUS_PAID = 'B'; // paid, waiting for the sample
const STATUS_TAKEN = 'T'; // sample taken, waiting for the report

// Same rule the API enforces for the sample details (letters, spaces, ' and -).
const DETAILS_PATTERN = /^[\p{L}\p{M}\s'-]+$/u;
const MAX_REPORT_BYTES = 1024 * 1024; // the API rejects PDFs over 1 MB

const formatDate = (value) => (value ? new Date(value).toLocaleDateString([], { dateStyle: 'medium' }) : '-');

// ==========================================
// One test to process: sample details (tab 1) or a report upload (tab 2)
// ==========================================
function TestCard({ test, mode, onDone }) {
  const [pRange, setPRange] = useState('');
  const [details, setDetails] = useState('');
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  const saveSample = async () => {
    const found = {};
    for (const [field, value] of [['p_range', pRange], ['details', details]]) {
      if (value.trim() && !DETAILS_PATTERN.test(value.trim())) found[field] = "Letters, spaces, ' and - only";
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      // `aid` here is the lab prescription's own id (the API's field is named that way).
      await apis.putRequest('/laboratory/details', {
        aid: test._id,
        ...(pRange.trim() && { p_range: pRange.trim() }),
        ...(details.trim() && { details: details.trim() }),
      });
      onDone();
    } catch (error) {
      // Already toasted by the http client; keep what was typed.
    }
  };

  const pickFile = (event) => {
    const chosen = event.target.files?.[0] ?? null;
    event.target.value = ''; // so choosing the same file again still fires onChange
    if (!chosen) return;
    if (chosen.type !== 'application/pdf') {
      toast.error('The report must be a PDF file.');
      return;
    }
    if (chosen.size > MAX_REPORT_BYTES) {
      toast.error('The report must not exceed 1 MB.');
      return;
    }
    setFile(chosen);
  };

  const uploadReport = async () => {
    if (!file) {
      toast.error('Choose the report PDF first.');
      return;
    }
    const formData = new FormData();
    formData.append('id', test._id);
    formData.append('report', file);
    try {
      await apis.uploadFilePutRequest('/laboratory/report', formData);
      onDone();
    } catch (error) {
      // Already toasted by the http client; keep the chosen file.
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {test.tname}
          </Typography>
          <Chip size="small" variant="outlined" label={`Dr. ${test.dname || '-'} · ${formatDate(test.schedule_date)}`} />
        </Box>

        {mode === 'sample' ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Details to take from the patient: {test.pat_details || '-'}
              {test.n_range ? ` · Normal range: ${test.n_range}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <TextField
                size="small"
                label="Patient's reading"
                value={pRange}
                onChange={(e) => setPRange(e.target.value)}
                error={Boolean(errors.p_range)}
                helperText={errors.p_range || ' '}
                sx={{ flex: '1 1 220px' }}
              />
              <TextField
                size="small"
                label="Details collected"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                error={Boolean(errors.details)}
                helperText={errors.details || ' '}
                sx={{ flex: '2 1 280px' }}
              />
              <Button variant="contained" onClick={saveSample} sx={{ height: 40 }}>
                Save sample details
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {test.details ? `Sample details: ${test.details}` : 'Sample taken.'}
              {test.p_range ? ` · Reading: ${test.p_range}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                Choose PDF report
                <input hidden type="file" accept="application/pdf" onChange={pickFile} />
              </Button>
              <Typography variant="body2" color={file ? 'text.primary' : 'text.secondary'} sx={{ flexGrow: 1 }}>
                {file ? file.name : 'No file chosen (PDF, up to 1 MB)'}
              </Typography>
              <Button variant="contained" onClick={uploadReport} disabled={!file} sx={{ height: 40 }}>
                Upload report
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// STEP 2: the patient's tests that are ready for this tab's work
// ==========================================
function LabStep({ patient, mode, onBack }) {
  const [tests, setTests] = useState(null); // null = still loading
  const [reloadKey, setReloadKey] = useState(0);

  const wantedStatus = mode === 'sample' ? STATUS_PAID : STATUS_TAKEN;

  // POST /laboratory/prescription?pid= returns the patient's tests GROUPED BY
  // APPOINTMENT: [{ aid, did, dname, schedule_date, items: [...] }]. Keep the
  // tests in the status this tab works on, each tagged with its visit's doctor and date.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const groups = await apis.postReadRequest(`/laboratory/prescription?pid=${encodeURIComponent(patient.pid)}`);
        const flat = (groups || []).flatMap((g) =>
          g.items
            .filter((t) => t.status === wantedStatus)
            .map((t) => ({ ...t, aid: g.aid, dname: g.dname, schedule_date: g.schedule_date }))
        );
        if (!cancelled) setTests(flat);
      } catch (error) {
        if (!cancelled) setTests([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patient.pid, wantedStatus, reloadKey]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {patient.pname}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {patient.pid} · {patient.mobile}
          </Typography>
        </Box>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Change patient
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
        {tests === null ? (
          [1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 1 }} />)
        ) : tests.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
            {mode === 'sample' ? 'No paid tests are waiting for a sample.' : 'No tests are waiting for a report.'}
          </Typography>
        ) : (
          tests.map((t) => <TestCard key={t._id} test={t} mode={mode} onDone={() => setReloadKey((k) => k + 1)} />)
        )}
      </Box>
    </Box>
  );
}

// One tab's whole flow: find the patient -> Next -> their tests
function LabWorkflowTab({ mode }) {
  const [patient, setPatient] = useState(null);
  return patient ? <LabStep patient={patient} mode={mode} onBack={() => setPatient(null)} /> : <PatientFinder onNext={setPatient} />;
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function PatientTestsPage({ currentUser }) {
  // Decoded once per currentUser change; viewing is the page gate, each tab needs its own permission.
  const flags = useMemo(() => decodeToFlags(currentUser?.permissions), [currentUser?.permissions]);
  const tabs = [
    flags.has('updateLabPrescriptionStatus') && { value: 'sample', label: 'Take Sample Details' },
    flags.has('uploadLabReport') && { value: 'report', label: 'Add Report' },
  ].filter(Boolean);

  const [tab, setTab] = useState(null);
  const activeTab = tabs.find((t) => t.value === tab)?.value ?? tabs[0]?.value;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 900, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        {tabs.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
              Your role can view lab tests but not take samples or add reports.
            </Typography>
          </CardContent>
        ) : (
          <>
            <Tabs
              value={activeTab}
              indicatorColor="primary"
              textColor="primary"
              onChange={(e, next) => setTab(next)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
            >
              {tabs.map((t) => (
                <Tab key={t.value} value={t.value} label={t.label} />
              ))}
            </Tabs>

            <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
              {/* keyed by tab so switching tabs starts that tab's flow from the patient search */}
              <LabWorkflowTab key={activeTab} mode={activeTab} />
            </CardContent>
          </>
        )}
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
PatientTestsPage.layout = 'dashboard';
PatientTestsPage.requiredPermissions = PAGE_ACCESS.labPatientTests;
