import React, { useState } from "react";
import { useRouter } from 'next/router';
import Grid from '@mui/material/Grid2';
import {
  TextField,
  Card,
  CardContent,
  Typography,
  Box
} from '@mui/material';
import { apis } from "../../services/commonServices";
import CardActionButton from "../../components/CardActionButton";

export default function LoginPage() {
  const router = useRouter();
  const [formValues, setFormValues] = useState({ uname: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      // Login sends no user data back - just the session cookies (and a
      // 'FTLG' marker when the account still has its temporary password).
      // Every protected page loads the current user itself.
      const result = await apis.postRequest('/auth/login', formValues);

      if (result === 'FTLG') {
        // Only the username is handed over (sessionStorage, never the URL);
        // the temporary password is typed again on the next page.
        sessionStorage.setItem('firstLoginUname', formValues.uname);
        router.push('/auth/first-login');
        return;
      }
      router.push('/home');
    } catch (error) {
      // The shared http client already toasted the server's message.
      console.error("Login Error:", error);
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
        bgcolor="#f4f6f8" // Subtle background color to make the white card pop
      >
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px' }}>
        <Card sx={{ boxShadow: 4, borderRadius: 2, p: 2 }}>
          <CardContent>
            <Grid container spacing={3} justifyContent="center">

              <Grid size={{ xs: 12 }} textAlign="center">
                <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
                  Hospital Portal
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Please log in to your account
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  slotProps={{ inputLabel: { shrink: true } }} // always floated: phone autofill fills the box without React seeing it, which left the label on top of the text
                  fullWidth
                  name="uname"
                  id="uname"
                  label="Username"
                  variant="outlined"
                  value={formValues.uname}
                  onChange={handleInputChange}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  slotProps={{ inputLabel: { shrink: true } }} // always floated: phone autofill fills the box without React seeing it, which left the label on top of the text
                  fullWidth
                  name="password"
                  id="password"
                  label="Password"
                  type="password"
                  variant="outlined"
                  value={formValues.password}
                  onChange={handleInputChange}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12 }} mt={2}>
                <CardActionButton type="submit" disabled={isLoggingIn}>
                  Login
                </CardActionButton>
              </Grid>

            </Grid>
          </CardContent>
        </Card>
      </form>
      </Box>
    </>
  );
}

// Ensure this page has NO layout applied to it so it stays full-screen
LoginPage.layout = 'none';
