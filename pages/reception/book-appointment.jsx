import React, { useState } from 'react';
import Grid from '@mui/material/Grid2';
import { 
  Card, 
  CardContent, 
  Button, 
  Typography, 
  Box 
} from '@mui/material';
import { toast } from 'react-toastify';

// Import your refactored components!
import { PatientAutocomplete } from '../../components/patientAutoComp';
import BookOPDAppointment from '../../components/BookOPDAppointment';

export default function BookAppointmentPage() {
  // Global form state passed down to components
  const [patient, setPatient] = useState(null);
  const [part, setPart] = useState(0);

  const handleNext = () => {
    if (!patient) {
      toast.error("Please select a Patient first.");
      return;
    }
    
    // Prevent double-booking
    if (patient.opd) {
      toast.warn(
        <div>
          Already booked an appointment with<br />
          <strong>Dr. {patient.opd}</strong>
        </div>
      );
      return;
    }
    
    // Move to the Doctor Selection step
    setPart((prev) => (prev + 1) % 3);
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        OPD Appointment Booking
      </Typography>

      {/* STEP 1: PATIENT SELECTION */}
      {part === 0 ? (
        <Grid container justifyContent="center" spacing={2} sx={{ mt: 3 }}>
          <Card sx={{ position: "relative", width: { md: "50%", xs: "100%" }, minHeight: "65vh", boxShadow: 3 }}>
            <CardContent sx={{ pb: 10 }}>
              
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Step 1: Patient Details
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Search for an existing patient by Name, ID, or Mobile number.
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <PatientAutocomplete
                    index={1} // Search by Name
                    setPatient={setPatient}
                    patient={patient}
                    opd={1} // Assuming 1 flags this as an OPD search in your backend
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <PatientAutocomplete
                    index={2} // Search by ID
                    setPatient={setPatient}
                    patient={patient}
                    opd={1}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <PatientAutocomplete
                    index={3} // Search by Mobile
                    setPatient={setPatient}
                    patient={patient}
                    opd={1}
                  />
                </Grid>
              </Grid>
            </CardContent>

            {/* ACTION BUTTONS (BOTTOM FIXED to match OtherParts) */}
            <Grid 
              container 
              spacing={2} 
              sx={{ 
                position: "absolute", 
                bottom: 0, 
                left: 0, 
                right: 0, 
                p: 2, 
                bgcolor: 'background.paper', 
                borderTop: '1px solid #e0e0e0' 
              }}
            >
              <Grid size={{ xs: 12 }}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  color="primary" 
                  onClick={handleNext}
                  sx={{ height: "6vh", fontWeight: "bold", fontSize: "1.1rem" }}
                >
                  Next
                </Button>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      ) : (
        /* STEPS 2 & 3: DOCTOR & CALENDAR (Handled by BookOPDAppointment) */
        <Box sx={{ mt: 3 }}>
          <BookOPDAppointment
            part={part}
            setPart={setPart}
            patient={patient}
            setPatient={setPatient}
            index={1} // Flags BookOPDAppointment to behave as the sub-component
          />
        </Box>
      )}
    </Box>
  );
}

// NEXT.JS SECURITY GATE
BookAppointmentPage.layout = 'dashboard';
BookAppointmentPage.allowedRoles = ['admin', 'receptionist'];