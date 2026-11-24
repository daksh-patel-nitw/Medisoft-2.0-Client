import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Tabs, Tab, Box, Button, Typography, TextField, Chip, Skeleton, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
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

// Same rule the API enforces for the sample detail (letters, digits, spaces and . , - / % ( ), up to 200 characters).
const DETAILS_PATTERN = /^[\p{L}\p{M}\p{N}\s.,\-/%()]+$/u;
const MAX_REPORT_BYTES = 1024 * 1024; // the API rejects PDFs over 1 MB

const formatDate = (value) => (value ? new Date(value).toLocaleDateString([], { dateStyle: 'medium' }) : '-');

// ==========================================
// One test to process: sample details (tab 1) or a report upload (tab 2)
// ==========================================
function TestCard({ test, mode, onDone }) {
  const [details, setDetails] = useState('');
  const [checked, setChecked] = useState([]); // the default details that were ticked
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});

  // What THIS test asks for when the sample is taken (see the lab test form): one detail typed into a box whose
  // label is the test's `pat_details`, and ready-made items to tick. Each is mandatory or optional. A test
  // prescribed before these existed has none of the flags, so it asks for nothing in particular.
  const patDetails = test.pat_details || '';
  const defaultDetails = test.default_details ?? [];

  const toggle = (name) => setChecked((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const saveSample = async () => {
    const found = {};
    const typed = details.trim();
    if (patDetails && test.pat_details_mandatory && !typed) found.details = 'Required';
    else if (typed && !DETAILS_PATTERN.test(typed)) found.details = 'Letters, numbers, spaces and . , - / % ( ) only';
    else if (typed.length > 200) found.details = 'Up to 200 characters';
    const missing = defaultDetails.filter((d) => d.mandatory && !checked.includes(d.name));
    if (missing.length > 0) found.checked = `Please confirm: ${missing.map((d) => d.name).join(', ')}`;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      // `aid` here is the lab prescription's own id (the API's field is named that way).
      await apis.putRequest('/laboratory/details', {
        aid: test._id,
        ...(typed && { details: typed }),
        ...(defaultDetails.length > 0 && { checked }),
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
            {test.n_range && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Normal range: {test.n_range}
              </Typography>
            )}

            {/* the one detail to type in: its label is what the test asks the lab to collect */}
            {patDetails && (
              <TextField
                fullWidth
                size="small"
                label={patDetails}
                required={Boolean(test.pat_details_mandatory)}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                error={Boolean(errors.details)}
                helperText={errors.details || (test.pat_details_mandatory ? ' ' : 'Optional')}
                sx={{ mb: 1 }}
              />
            )}

            {/* ready-made items to tick */}
            {defaultDetails.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Confirm</Typography>
                <FormGroup>
                  {defaultDetails.map((d) => (
                    <FormControlLabel
                      key={d.name}
                      control={<Checkbox size="small" checked={checked.includes(d.name)} onChange={() => toggle(d.name)} />}
                      label={`${d.name} (${d.mandatory ? 'required' : 'optional'})`}
                    />
                  ))}
                </FormGroup>
                <Typography variant="caption" color="error" component="div" sx={{ minHeight: 18 }}>
                  {errors.checked || ' '}
                </Typography>
              </Box>
            )}

            {!patDetails && defaultDetails.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Nothing needs to be collected for this test.
              </Typography>
            )}

            <Button variant="contained" onClick={saveSample}>
              Save sample details
            </Button>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {test.details ? `${test.pat_details ? `${test.pat_details}: ` : 'Sample details: '}${test.details}` : 'Sample taken.'}
              {(test.checked_details ?? []).length > 0 ? ` · Confirmed: ${test.checked_details.join(', ')}` : ''}
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
