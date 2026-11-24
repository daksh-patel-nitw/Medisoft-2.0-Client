import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import CardActionButton from '../components/CardActionButton';
import WorkingDaysPicker from '../components/WorkingDaysPicker';
import { apis } from '../services/commonServices';
import { toDateInput, validators } from '../utils/memberValidation';

const GENDERS = { M: 'Male', F: 'Female', O: 'Other' };
const MAX_QUESTIONS = 20;

// The fields every member can edit, with the rule each must pass.
const CONTACT_FIELDS = [
  { key: 'mobile', label: 'Mobile', validate: validators.mobile, inputMode: 'numeric' },
  { key: 'email', label: 'Email', validate: validators.email },
  { key: 'address', label: 'Address', validate: validators.address, wide: true },
  { key: 'city', label: 'City', validate: validators.city },
  { key: 'pincode', label: 'Pincode', validate: validators.pincode, inputMode: 'numeric' },
];

const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Read-only value: shown in a disabled box so it lines up with the editable ones. */
function ReadOnly({ label, value }) {
  return <TextField fullWidth size="small" label={label} value={value ?? ''} disabled slotProps={{ inputLabel: { shrink: true } }} />;
}

function ProfileForm({ profile, onSaved }) {
  const doctor = profile.doctor ?? null;

  // what the form holds now; `profile` (from the server) is what it is compared with to find the changes
  const [values, setValues] = useState(() => ({
    mobile: profile.mobile ?? '',
    email: profile.email ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    pincode: profile.pincode ?? '',
    opd_charge: doctor?.opd_charge != null ? String(doctor.opd_charge) : '',
    ipd_charge: doctor?.ipd_charge != null ? String(doctor.ipd_charge) : '',
    start: doctor?.timings?.[0] ?? '',
    end: doctor?.timings?.[1] ?? '',
    workingDays: doctor?.workingDays ?? [],
    questions: doctor?.questions ?? [],
  }));
  const [newQuestion, setNewQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const errors = useMemo(() => {
    const out = {};
    for (const f of CONTACT_FIELDS) out[f.key] = f.validate(values[f.key]);
    if (doctor) {
      if (doctor.opd) out.opd_charge = validators.positive(values.opd_charge);
      if (doctor.ipd) out.ipd_charge = validators.positive(values.ipd_charge);
      out.workingDays = values.workingDays.length === 0 ? 'Pick at least one day' : '';
      out.timings = !values.start || !values.end ? 'Set both times' : values.start >= values.end ? 'The start must be before the end' : '';
    }
    return out;
  }, [values, doctor]);

  // only what actually changed is sent
  const changes = useMemo(() => {
    const out = {};
    for (const f of CONTACT_FIELDS) {
      if (String(values[f.key]).trim() !== String(profile[f.key] ?? '')) out[f.key] = String(values[f.key]).trim();
    }
    if (doctor) {
      if (doctor.opd && values.opd_charge.trim() !== String(doctor.opd_charge ?? '')) out.opd_charge = values.opd_charge.trim();
      if (doctor.ipd && values.ipd_charge.trim() !== String(doctor.ipd_charge ?? '')) out.ipd_charge = values.ipd_charge.trim();
      if (values.start !== (doctor.timings?.[0] ?? '') || values.end !== (doctor.timings?.[1] ?? '')) out.timings = [values.start, values.end];
      if (!sameList(values.workingDays, doctor.workingDays ?? [])) out.workingDays = values.workingDays;
      if (doctor.opd && !sameList(values.questions, doctor.questions ?? [])) out.questions = values.questions;
    }
    return out;
  }, [values, profile, doctor]);

  const hasChanges = Object.keys(changes).length > 0;
  const showError = (key) => (submitted && errors[key] ? errors[key] : ' ');

  const addQuestion = () => {
    const q = newQuestion.trim();
    if (!q || q.length > 100 || values.questions.includes(q) || values.questions.length >= MAX_QUESTIONS) return;
    setValues((prev) => ({ ...prev, questions: [...prev.questions, q] }));
    setNewQuestion('');
  };

  const save = async () => {
    setSubmitted(true);
    // only the fields being changed have to be valid
    if (Object.keys(changes).some((key) => errors[key] || (key === 'timings' && errors.timings))) return;
    if (!hasChanges) return;
    setSaving(true);
    try {
      await apis.putRequest('/users/profile', changes);
      onSaved();
    } catch (error) {
      // already toasted by the http client; the form keeps what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          {[profile.fname, profile.middlename, profile.lname].filter(Boolean).join(' ')}
        </Typography>
        <Chip label={`ID: ${profile.id}`} color="primary" variant="outlined" />
        <Chip label={profile.mtype === 'pat' ? 'Patient' : 'Employee'} size="small" />
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ReadOnly label="Member ID" value={profile.id} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <ReadOnly label="Date of birth" value={toDateInput(profile.dob)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <ReadOnly label="Gender" value={GENDERS[profile.gender] ?? profile.gender} />
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary">
        Your name, date of birth and gender can only be corrected by reception.
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        {CONTACT_FIELDS.map((f) => (
          <Grid key={f.key} size={{ xs: 12, sm: f.wide ? 12 : 6 }}>
            <TextField
              fullWidth
              size="small"
              label={f.label}
              value={values[f.key]}
              onChange={set(f.key)}
              error={submitted && Boolean(errors[f.key])}
              helperText={showError(f.key)}
              slotProps={{ htmlInput: { inputMode: f.inputMode } }}
            />
          </Grid>
        ))}
      </Grid>

      {doctor?.needsSetup && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Your doctor details are not complete yet.{' '}
          <Link href="/doctor/setup">Complete them now</Link>
        </Alert>
      )}

      {doctor && (
        <>
          <Divider sx={{ my: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Doctor details
            </Typography>
          </Divider>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadOnly label="Degree" value={doctor.degree} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadOnly label="College" value={doctor.college} />
            </Grid>
            {doctor.opd && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="OPD consultation charge (₹)"
                  value={values.opd_charge}
                  onChange={set('opd_charge')}
                  error={submitted && Boolean(errors.opd_charge)}
                  helperText={showError('opd_charge')}
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
              </Grid>
            )}
            {doctor.ipd && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="IPD fee per day (₹)"
                  value={values.ipd_charge}
                  onChange={set('ipd_charge')}
                  error={submitted && Boolean(errors.ipd_charge)}
                  helperText={showError('ipd_charge')}
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
              </Grid>
            )}
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Working from"
                value={values.start}
                onChange={set('start')}
                error={submitted && Boolean(errors.timings)}
                helperText={showError('timings')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="time"
                label="Working until"
                value={values.end}
                onChange={set('end')}
                error={submitted && Boolean(errors.timings)}
                helperText=" "
                slotProps={{ inputLabel: { shrink: true } }}
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
          </Grid>

          {doctor.opd && (
            <>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Questions for the patient ({values.questions.length}/{MAX_QUESTIONS})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reception asks these when the patient arrives; the ones answered yes show on your screen.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, my: 1 }}>
            {values.questions.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No questions yet.
              </Typography>
            )}
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
        </>
      )}

      <CardActionButton onClick={save} disabled={!hasChanges || saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </CardActionButton>
    </>
  );
}

// Open to every registered member: it is always their OWN profile (the server takes the id from the session).
export default function ProfilePage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, profile: null });

  // GET /users/profile -> { id, mtype, fname, ..., mobile, email, address, city, pincode, doctor? } or null
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let profile = null;
      try {
        profile = (await apis.getRequest('/users/profile')) ?? null;
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) setResult({ key: reloadKey, profile });
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
          {result.key === null ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : result.profile === null ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              There is no personal profile for this account.
            </Typography>
          ) : (
            // keyed so the form restarts from the saved values after a save
            <ProfileForm key={result.key} profile={result.profile} onSaved={() => setReloadKey((k) => k + 1)} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// Any logged-in member - no permission bits.
ProfilePage.layout = 'dashboard';
ProfilePage.requireLogin = true;
