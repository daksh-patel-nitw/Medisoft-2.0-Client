import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Alert, Box, Button, Card, CardContent, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { apis } from '../../services/commonServices';
import CardActionButton from '../../components/CardActionButton';

// Same rule the server enforces (v_password in the API's commonValidation.ts).
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$*])[A-Za-z\d@#$*]{8,16}$/;
const PASSWORD_HINT = '8-16 characters with an uppercase letter, a lowercase letter, a digit and one of @ # $ *';
const STEPS = ['Find your account', 'Enter the code', 'New password'];
const RESEND_SECONDS = 60;

/**
 * Forgotten password, all on one page (no separate URLs to guard):
 *   1. POST /auth/forgot-password { uname }                          -> a code is emailed (same answer whether or not the account exists)
 *   2. POST /auth/verify-otp { uname, otp }                          -> { resetToken }  (single use, held in state only)
 *   3. POST /auth/reset-password { resetToken, password, confirmPassword } -> { stillLocked }
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [uname, setUname] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [done, setDone] = useState(null); // { stillLocked } once the password is changed

  // count the resend cooldown down once a second
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    await apis.postRequest('/auth/forgot-password', { uname: uname.trim() });
    setCooldown(RESEND_SECONDS);
  };

  const submitIdentify = async (event) => {
    event.preventDefault();
    if (!uname.trim()) {
      setErrors({ uname: 'Enter your member ID or email' });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await sendCode();
      setStep(1);
    } catch (error) {
      // already toasted by the http client
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      await sendCode();
    } catch (error) {
      // already toasted by the http client
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: 'Enter the 6-digit code from the email' });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const data = await apis.postRequest('/auth/verify-otp', { uname: uname.trim(), otp });
      setResetToken(data.resetToken);
      setStep(2);
    } catch (error) {
      // already toasted ("Invalid or expired code.")
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    const found = {};
    if (!PASSWORD_RULE.test(password)) found.password = PASSWORD_HINT;
    if (!confirmPassword) found.confirmPassword = 'Confirm your new password';
    else if (confirmPassword !== password) found.confirmPassword = 'Passwords do not match';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const data = await apis.postRequest('/auth/reset-password', { resetToken, password, confirmPassword });
      setResetToken('');
      setDone({ stillLocked: Boolean(data?.stillLocked) });
    } catch (error) {
      // already toasted; an expired token means starting again
      setBusy(false);
    }
  };

  const field = (props) => ({ fullWidth: true, slotProps: { inputLabel: { shrink: true } }, ...props });

  return (
    <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1} bgcolor="#f4f6f8">
      <Card sx={{ boxShadow: 4, borderRadius: 2, p: 2, width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Grid container spacing={3} justifyContent="center">
            <Grid size={{ xs: 12 }} textAlign="center">
              <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                Reset your password
              </Typography>
            </Grid>

            {done ? (
              <>
                <Grid size={{ xs: 12 }}>
                  <Alert severity="success">Your password has been changed.</Alert>
                </Grid>
                {done.stillLocked && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="warning">This account was locked by an administrator, so you cannot sign in yet. Contact the administrator to unlock it.</Alert>
                  </Grid>
                )}
                <Grid size={{ xs: 12 }}>
                  <CardActionButton onClick={() => router.push('/auth/login')}>Go to login</CardActionButton>
                </Grid>
              </>
            ) : (
              <>
                <Grid size={{ xs: 12 }}>
                  <Stepper activeStep={step} alternativeLabel>
                    {STEPS.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Grid>

                {step === 0 && (
                  <Grid size={{ xs: 12 }} component="form" onSubmit={submitIdentify} noValidate>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="textSecondary">
                          Enter your member ID or email. We will email you a 6-digit code.
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          {...field({
                            name: 'uname',
                            label: 'Member ID or email',
                            value: uname,
                            onChange: (e) => setUname(e.target.value),
                            error: Boolean(errors.uname),
                            helperText: errors.uname,
                            autoFocus: true,
                          })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <CardActionButton type="submit" disabled={busy}>
                          {busy ? 'Sending...' : 'Next'}
                        </CardActionButton>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {step === 1 && (
                  <Grid size={{ xs: 12 }} component="form" onSubmit={submitOtp} noValidate>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="textSecondary">
                          If the account exists, a code was sent to its email address. It is valid for 10 minutes.
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          {...field({
                            name: 'otp',
                            label: '6-digit code',
                            value: otp,
                            onChange: (e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)),
                            error: Boolean(errors.otp),
                            helperText: errors.otp,
                            autoFocus: true,
                            autoComplete: 'one-time-code',
                            slotProps: { inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric' } },
                          })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <CardActionButton type="submit" disabled={busy}>
                          {busy ? 'Checking...' : 'Next'}
                        </CardActionButton>
                      </Grid>
                      <Grid size={{ xs: 12 }} textAlign="center">
                        <Button size="small" onClick={resend} disabled={busy || cooldown > 0}>
                          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {step === 2 && (
                  <Grid size={{ xs: 12 }} component="form" onSubmit={submitPassword} noValidate>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          {...field({
                            type: 'password',
                            name: 'password',
                            label: 'New password',
                            autoComplete: 'new-password',
                            value: password,
                            onChange: (e) => setPassword(e.target.value),
                            error: Boolean(errors.password),
                            helperText: errors.password || PASSWORD_HINT,
                            autoFocus: true,
                          })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          {...field({
                            type: 'password',
                            name: 'confirmPassword',
                            label: 'Confirm new password',
                            autoComplete: 'new-password',
                            value: confirmPassword,
                            onChange: (e) => setConfirmPassword(e.target.value),
                            error: Boolean(errors.confirmPassword),
                            helperText: errors.confirmPassword,
                          })}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <CardActionButton type="submit" disabled={busy}>
                          {busy ? 'Saving...' : 'Change password'}
                        </CardActionButton>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                <Grid size={{ xs: 12 }} textAlign="center">
                  <Link href="/auth/login" style={{ fontSize: 14 }}>
                    Back to login
                  </Link>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

// Full-screen, no dashboard layout - same as the login page. No requiredPermissions: it is public.
ResetPasswordPage.layout = 'none';
