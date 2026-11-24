import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Autocomplete, Box, Card, CardContent, Chip, CircularProgress, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/Add';
import CardActionButton from '../../components/CardActionButton';
import WorkingDaysPicker from '../../components/WorkingDaysPicker';
import { apis } from '../../services/commonServices';
import useDegreesStore from '../../store/useDegreesStore';
import { validators } from '../../utils/memberValidation';

const MAX_QUESTIONS = 20;

function SetupForm({ doctor, onDone }) {
  const { degrees, load: loadDegrees } = useDegreesStore();
  const [values, setValues] = useState(() => ({
    degree: doctor.degree || '',
    college: doctor.college || '',
    start: doctor.timings?.[0] ?? '',
    end: doctor.timings?.[1] ?? '',
    opd_charge: doctor.opd_charge != null ? String(doctor.opd_charge) : '',
    pph: doctor.pph != null ? String(doctor.pph) : '',
    workingDays: doctor.workingDays ?? [],
    ipd_charge: doctor.ipd_charge != null ? String(doctor.ipd_charge) : '',
    questions: doctor.questions ?? [],
  }));
  const [newQuestion, setNewQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDegrees();
  }, [loadDegrees]);

  const set = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));

  // everything that applies to this doctor's tags is required (questions are optional)
  const errors = useMemo(() => {
    const out = {
      degree: values.degree ? '' : 'Pick your degree from the list',
      college: validators.college(values.college),
      workingDays: values.workingDays.length === 0 ? 'Pick at least one day' : '',
      pph: /^\d+$/.test(values.pph.trim()) && Number(values.pph) >= 1 && Number(values.pph) <= 60 ? '' : 'A whole number from 1 to 60',
      timings: !values.start || !values.end ? 'Set both times' : values.start >= values.end ? 'The start must be before the end' : '',
    };
    if (doctor.opd) out.opd_charge = validators.positive(values.opd_charge);
    if (doctor.ipd) out.ipd_charge = validators.positive(values.ipd_charge);
    return out;
  }, [values, doctor]);
  const show = (key) => (submitted && errors[key] ? errors[key] : ' ');

  const addQuestion = () => {
    const q = newQuestion.trim();
    if (!q || q.length > 100 || values.questions.includes(q) || values.questions.length >= MAX_QUESTIONS) return;
    setValues((prev) => ({ ...prev, questions: [...prev.questions, q] }));
    setNewQuestion('');
  };

  const save = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    try {
      await apis.putRequest('/users/doctor-setup', {
        degree: values.degree,
        college: values.college.trim(),
        timings: [values.start, values.end],
        workingDays: values.workingDays,
        pph: values.pph.trim(),
        // the OPD charge and the questions are only for OPD doctors, the per-day fee only for IPD doctors
        ...(doctor.opd && { opd_charge: values.opd_charge.trim(), questions: values.questions }),
        ...(doctor.ipd && { ipd_charge: values.ipd_charge.trim() }),
      });
      onDone();
    } catch (error) {
      // already toasted by the http client; the form keeps what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Your doctor details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Tell us about your practice before you start. Your degree is shown to the public on the hospital website.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            size="small"
            options={degrees}
            value={values.degree || null}
            onChange={(e, next) => setValues((prev) => ({ ...prev, degree: next || '' }))}
            noOptionsText="No matching degree"
            renderInput={(params) => <TextField {...params} label="Degree" error={submitted && Boolean(errors.degree)} helperText={show('degree')} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="College" value={values.college} onChange={set('college')} error={submitted && Boolean(errors.college)} helperText={show('college')} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            fullWidth
            size="small"
            type="time"
            label="Working from"
            value={values.start}
            onChange={set('start')}
            error={submitted && Boolean(errors.timings)}
            helperText={show('timings')}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField fullWidth size="small" type="time" label="Working until" value={values.end} onChange={set('end')} error={submitted && Boolean(errors.timings)} helperText=" " slotProps={{ inputLabel: { shrink: true } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Patients per hour"
            value={values.pph}
            onChange={set('pph')}
            error={submitted && Boolean(errors.pph)}
            helperText={show('pph')}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="subtitle2" gutterBottom>
            Working days
          </Typography>
          <WorkingDaysPicker value={values.workingDays} onChange={(days) => setValues((prev) => ({ ...prev, workingDays: days }))} error={submitted && Boolean(errors.workingDays)} />
          <Typography variant="caption" color="error" component="div" sx={{ minHeight: 20 }}>
            {submitted && errors.workingDays ? errors.workingDays : ' '}
          </Typography>
        </Grid>
        {doctor.opd && (
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="OPD consultation charge (₹)"
              value={values.opd_charge}
              onChange={set('opd_charge')}
              error={submitted && Boolean(errors.opd_charge)}
              helperText={show('opd_charge')}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Grid>
        )}
        {doctor.ipd && (
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="IPD fee per day (₹)"
              value={values.ipd_charge}
              onChange={set('ipd_charge')}
              error={submitted && Boolean(errors.ipd_charge)}
              helperText={show('ipd_charge')}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Grid>
        )}
      </Grid>

      {doctor.opd && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">
            Questions for the patient ({values.questions.length}/{MAX_QUESTIONS})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reception asks these when the patient arrives; the ones answered yes show on your screen. You can leave this empty and add them later.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, my: 1 }}>
            {values.questions.map((q) => (
              <Chip key={q} label={q} onDelete={() => setValues((prev) => ({ ...prev, questions: prev.questions.filter((x) => x !== q) }))} />
            ))}
          </Box>
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              size="small"
              label="Add a question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addQuestion();
                }
              }}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <IconButton color="primary" onClick={addQuestion} aria-label="Add question" disabled={!newQuestion.trim() || values.questions.length >= MAX_QUESTIONS}>
              <AddIcon />
            </IconButton>
          </Stack>
        </>
      )}

      <CardActionButton onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save and continue'}
      </CardActionButton>
    </>
  );
}

// The doctor's one-time details after first login. Reached from the home page when anything is missing; any
// doctor can also open it later. The server requires a doctor permission and an employee record.
export default function DoctorSetupPage() {
  const router = useRouter();
  const [result, setResult] = useState({ loaded: false, doctor: null });

  // GET /users/profile -> { ..., doctor: { opd, ipd, degree, college, timings, workingDays, pph, questions, opd_charge, ipd_charge, needsSetup } }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let doctor = null;
      try {
        doctor = (await apis.getRequest('/users/profile'))?.doctor ?? null;
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) setResult({ loaded: true, doctor });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
          {!result.loaded ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : result.doctor === null ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              This page is only for doctors.
            </Typography>
          ) : (
            <SetupForm doctor={result.doctor} onDone={() => router.replace('/home')} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// Any logged-in user: the server decides whether they are a doctor.
DoctorSetupPage.layout = 'dashboard';
DoctorSetupPage.requireLogin = true;
