import React, { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import Grid from '@mui/material/Grid2';
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from "axios";
import { apis } from "../../services/commonServices";

export default function LoginPage() {
  const router = useRouter();
  const [formValues, setFormValues] = useState({ uname: '', password: '' });

  // Prevents Next.js Hydration mismatch by waiting for the client to check localStorage
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if the user is already logged in when the page loads
    const id = localStorage.getItem("id");
    const type = localStorage.getItem("role");

    if (id && type) {
      redirectBasedOnRole(type);
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  // Map roles to their specific Next.js page URLs
  const redirectBasedOnRole = (role) => {
    const routes = {
      pharmacy: '/pharmacy/dispense',
      ipd: '/ipd/dashboard',
      opd1: '/reception/register',
      opd2: '/reception/vitals',
      doctor: '/doctor/dashboard',
      lab: '/laboratory/patient-tests',
      admin: '/admin/roles',
      patient: '/patient/dashboard',
      bill: '/billing/dashboard'
    };

    const destination = routes[role] || '/';
    router.push(destination);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const user = await apis.postRequest(`${apiUrl}/auth/login`, formValues);
      console.log(user);
      localStorage.setItem('id', user.mid);
      localStorage.setItem('uname', user.name);
      localStorage.setItem('role', user.role);
      redirectBasedOnRole(user.role);
    } catch (error) {
      console.error("Login Error:", error);
      toast.error('Network Error: Unable to reach the server');
    }
  };

  // Show a loading spinner while Next.js checks localStorage on mount
  if (isCheckingAuth) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f4f6f8">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
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
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ fontWeight: 'bold', py: 1.5 }}
                >
                  Login
                </Button>
              </Grid>

            </Grid>
          </CardContent>
        </Card>
      </form>
    </Box>
  );
}

// Ensure this page has NO layout applied to it so it stays full-screen
LoginPage.layout = 'none';
