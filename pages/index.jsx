import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Box,
  Skeleton,
  Stack
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

// Note: We use hideHeader = true because we are building a custom landing page navbar!
const LandingPage = () => {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);

  // Client-side fetch so we can show Skeletons!
  useEffect(() => {
    // Simulating an API call to fetch doctors/data
    const fetchData = async () => {
      setLoading(true);
      // Replace this setTimeout with your actual Axios call:
      // const res = await apis.get('/api/doctors');
      setTimeout(() => {
        setDoctors([
          { id: 1, name: "Dr. Sarah Jenkins", spec: "Cardiology" },
          { id: 2, name: "Dr. Mark Sloan", spec: "Neurology" },
          { id: 3, name: "Dr. Emily Chen", spec: "Pediatrics" },
        ]);
        setLoading(false);
      }, 2000); // 2 second fake delay to see skeletons
    };

    fetchData();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', minHeight: '100vh', pb: 8 }}>
      
      {/* NAVBAR */}
      <AppBar position="sticky" sx={{ backgroundColor: 'white', color: 'primary.main' }}>
        <Toolbar>
          <LocalHospitalIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            MediCare Plus
          </Typography>
          
          {/* Desktop Navigation Links */}
          <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', md: 'flex' }, mr: 4 }}>
            <Button color="inherit" href="#doctors">Our Doctors</Button>
            <Button color="inherit" href="#pharmacy">Pharmacy</Button>
            <Button color="inherit" href="#lab">Lab & Tests</Button>
          </Stack>

          <Link href="/auth/login" passHref>
            <Button variant="contained" color="primary" disableElevation>
              Login
            </Button>
          </Link>
        </Toolbar>
      </AppBar>

      {/* HERO SECTION */}
      <Box sx={{ bgcolor: 'primary.dark', color: 'white', py: 10, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Your Health, Our Priority
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, mb: 4 }}>
            Comprehensive healthcare management, top-tier doctors, and fully equipped labs right at your fingertips.
          </Typography>
          <Button variant="contained" color="secondary" size="large">
            Book an Appointment
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: -5 }}>
        
        {/* DOCTORS SECTION */}
        <Box id="doctors" sx={{ mb: 8, pt: 8 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Meet Our Specialists
          </Typography>
          <Grid container spacing={4}>
            {loading 
              ? /* Show 3 Skeletons while loading */
                Array.from(new Array(3)).map((_, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ height: 200 }}>
                      <CardContent>
                        <Skeleton variant="text" sx={{ fontSize: '2rem' }} width="80%" />
                        <Skeleton variant="text" sx={{ fontSize: '1rem' }} width="60%" />
                        <Skeleton variant="rectangular" height={60} sx={{ mt: 2, borderRadius: 1 }} />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              : /* Show real data when done */
                doctors.map((doc) => (
                  <Grid item xs={12} sm={6} md={4} key={doc.id}>
                    <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {doc.name}
                        </Typography>
                        <Typography color="text.secondary">
                          {doc.spec}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button size="small" color="primary">View Profile</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
            }
          </Grid>
        </Box>

        {/* PHARMACY & LAB SECTION */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={6} id="pharmacy">
            <Card elevation={0} sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 4 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  24/7 Pharmacy
                </Typography>
                <Typography color="text.secondary" paragraph>
                  Order your prescribed medicines online and get them delivered to your ward or home instantly. We stock all major lifesavers and generic medicines.
                </Typography>
                <Button variant="outlined">Browse Medicines</Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} id="lab">
            <Card elevation={0} sx={{ bgcolor: '#fce4ec', p: 2, borderRadius: 4 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Laboratory & Tests
                </Typography>
                <Typography color="text.secondary" paragraph>
                  State-of-the-art pathology labs. Book blood tests, MRIs, and X-Rays online and get your reports directly on your patient dashboard.
                </Typography>
                <Button variant="outlined" color="secondary">View Test Catalog</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

      </Container>
    </Box>
  );
};

// We don't want the global _app.jsx header showing up over our custom landing page header!
LandingPage.hideHeader = true;

export default LandingPage;