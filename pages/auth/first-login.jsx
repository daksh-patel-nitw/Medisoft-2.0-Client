import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { TextField, Card, CardContent, Typography, Box, CircularProgress, Autocomplete } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { apis } from '../../services/commonServices';
import CardActionButton from '../../components/CardActionButton';
import { browserTimeZone } from '../../utils/timeZone';

// every zone the browser knows (falls back to the browser's own zone on very old browsers)
const TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [browserTimeZone()];

// Same rule the server enforces (v_password in the API's commonValidation.ts),
// checked here first so the user gets the hint before a round trip.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$*])[A-Za-z\d@#$*]{8,16}$/;
const PASSWORD_HINT = '8-16 characters with an uppercase letter, a lowercase letter, a digit and one of @ # $ *';

/** Returns { field: message } for every invalid field; empty object means valid. */
function validateFirstLoginForm({ currentPassword, newPassword, confirmPassword, timezone }) {
  const errors = {};
  if (!timezone) errors.timezone = 'Select your timezone';
  if (!currentPassword) errors.currentPassword = 'Enter your current (temporary) password';
  if (!newPassword) errors.newPassword = 'Enter a new password';
  else if (!PASSWORD_RULE.test(newPassword)) errors.newPassword = PASSWORD_HINT;
  else if (newPassword === currentPassword) errors.newPassword = 'New password must be different from the current one';
  if (!confirmPassword) errors.confirmPassword = 'Confirm your new password';
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export default function FirstLoginPage() {
  const router = useRouter();
  const [uname, setUname] = useState(null);
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', timezone: browserTimeZone() });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The login page leaves the username in sessionStorage when it gets the
  // first-time-login marker. No username (page opened directly, new tab,
  // refreshed after success) means there's nothing to reset - back to login.
  useEffect(() => {
    const stored = sessionStorage.getItem('firstLoginUname');
    if (!stored) {
      router.replace('/auth/login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUname(stored);
  }, [router]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateFirstLoginForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSubmitting(true);
    try {
      await apis.postRequest('/auth/set-password', {
        uname,
        tempPassword: values.currentPassword,
        newPassword: values.newPassword,
        timezone: values.timezone,
      });
      sessionStorage.removeItem('firstLoginUname');
      router.push('/auth/login');
    } catch (error) {
      // The shared http client already toasted the server's message (a 401
      // "Invalid credentials" doesn't leave /auth/ pages - see httpClient.js),
      // so just stay here and let the user retry.
      console.error('Set password error:', error);
      setIsSubmitting(false);
    }
  };

  if (!uname) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1} bgcolor="#f4f6f8">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1} bgcolor="#f4f6f8">
      <form onSubmit={handleSubmit} noValidate style={{ width: '100%', maxWidth: '400px' }}>
        <Card sx={{ boxShadow: 4, borderRadius: 2, p: 2 }}>
          <CardContent>
            <Grid container spacing={3} justifyContent="center">
              <Grid size={{ xs: 12 }} textAlign="center">
                <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                  Set your password
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  This is your first login. Choose a new password to continue.
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  slotProps={{ inputLabel: { shrink: true } }} // always floated: phone autofill fills the box without React seeing it, which left the label on top of the text
                  fullWidth
                  type="password"
                  name="currentPassword"
                  label="Current password"
                  autoComplete="current-password"
                  value={values.currentPassword}
                  onChange={handleChange}
                  error={Boolean(errors.currentPassword)}
                  helperText={errors.currentPassword}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  slotProps={{ inputLabel: { shrink: true } }} // always floated: phone autofill fills the box without React seeing it, which left the label on top of the text
                  fullWidth
                  type="password"
                  name="newPassword"
                  label="New password"
                  autoComplete="new-password"
                  value={values.newPassword}
                  onChange={handleChange}
                  error={Boolean(errors.newPassword)}
                  helperText={errors.newPassword || PASSWORD_HINT}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  slotProps={{ inputLabel: { shrink: true } }} // always floated: phone autofill fills the box without React seeing it, which left the label on top of the text
                  fullWidth
                  type="password"
                  name="confirmPassword"
                  label="Confirm new password"
                  autoComplete="new-password"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  error={Boolean(errors.confirmPassword)}
                  helperText={errors.confirmPassword}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={TIME_ZONES}
                  value={values.timezone || null}
                  onChange={(e, next) => {
                    setValues((prev) => ({ ...prev, timezone: next || '' }));
                    if (errors.timezone) setErrors((prev) => ({ ...prev, timezone: undefined }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Timezone"
                      error={Boolean(errors.timezone)}
                      helperText={errors.timezone || 'Chosen from this device - change it if it is wrong'}
                      slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps?.inputLabel, shrink: true } }}
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }} mt={1}>
                <CardActionButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Set password'}
                </CardActionButton>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </form>
    </Box>
  );
}

// Full-screen, no dashboard layout - same as the login page.
FirstLoginPage.layout = 'none';
