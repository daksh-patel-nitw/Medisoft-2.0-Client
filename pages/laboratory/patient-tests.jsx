import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TextField,
  Box,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';
import { apis } from '../../Services/commonServices';
import { PatientAutocomplete } from '../../components/patientAutoComp';
import usePatientStore from '../../store/usePatientStore'; // <-- Zustand Store

// ==========================================
// REUSABLE COMPONENT: Lab Workflow Tab
// Handles both "Take Details" and "Add Results" modes
// ==========================================
const LabWorkflowTab = ({ mode }) => {
  const [step, setStep] = useState(0); // 0 = Search Patient, 1 = Process Tests
  const [patient, setPatient] = useState(null);
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [details, setDetails] = useState({}); // Stores text inputs by test ID
  const [files, setFiles] = useState({});     // Stores file uploads by test ID

  // Zustand
  const clearPatientGlobal = usePatientStore((state) => state.clearPatient);

  // Fetch tests when entering Step 1
  useEffect(() => {
    if (step === 1 && patient) {
      const fetchTests = async () => {
        setIsLoading(true);
        try {
          const body = { 
            pid: patient.pid,
            status: mode === 'details' ? "B" : "T" // B = Booked, T = Taken
          };
          const data = await apis.noTokenPostRequest('/lab/prescription', body);
          setTests(data || []);
        } catch (error) {
          toast.error("Failed to fetch patient tests.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchTests();
    }
  }, [step, patient, mode]);

  // Handle resetting back to search
  const handleGoBack = () => {
    setStep(0);
    setPatient(null);
    setTests([]);
    setDetails({});
    setFiles({});
    clearPatientGlobal();
  };

  const handleNext = () => {
    if (!patient) {
      toast.warn("Please select a patient first.");
      return;
    }
    setStep(1);
  };

  // ----- ACTION: Take Details (Mode: 'details') -----
  const handleTakeTest = async (testId) => {
    if (!details[testId]) {
      toast.warn("Please enter the Patient Details to proceed.");
      return;
    }

    try {
      const body = { 
        id: testId, 
        status: "T", 
        details: details[testId] 
      };
      const status = await apis.noTokenStatusPutRequest('/lab/details', body);
      
      if (status === 200) {
        toast.success("Sample taken and details saved.");
        setTests(tests.filter((t) => t._id !== testId));
        setDetails(prev => ({ ...prev, [testId]: "" }));
      }
    } catch (error) {
      toast.error("Failed to save details.");
    }
  };

  // ----- ACTION: Upload Report (Mode: 'results') -----
  const handleUploadReport = async (testId) => {
    const file = files[testId];
    if (!file) {
      toast.warn("Please select a PDF file to upload.");
      return;
    }
    if (!details[testId]) {
      toast.warn("Please enter the Patient Range to proceed.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("id", testId);
      formData.append("status", "D"); // D = Done
      formData.append("report", file);
      formData.append("p_range", details[testId]);

      const status = await apis.uploadFileRequest("/lab/details", formData);
      
      if (status === 200) {
        toast.success("Report uploaded successfully.");
        setTests(tests.filter((t) => t._id !== testId));
        setFiles(prev => ({ ...prev, [testId]: null }));
        setDetails(prev => ({ ...prev, [testId]: "" }));
      }
    } catch (error) {
      toast.error("Failed to upload report.");
    }
  };

  // ==========================================
  // RENDER: STEP 0 (Search Patient)
  // ==========================================
  if (step === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>Find Patient</Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <PatientAutocomplete index={1} setPatient={setPatient} patient={patient} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <PatientAutocomplete index={2} setPatient={setPatient} patient={patient} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <PatientAutocomplete index={3} setPatient={setPatient} patient={patient} />
            </Grid>
          </Grid>
        </CardContent>
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button variant="contained" fullWidth color="primary" onClick={handleNext} sx={{ height: "6vh", fontWeight: "bold", fontSize: "1.1rem" }}>
            Next: View Tests
          </Button>
        </Box>
      </Box>
    );
  }

  // ==========================================
  // RENDER: STEP 1 (Process Tests)
  // ==========================================
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle1">
            <strong>Patient Name:</strong> {patient?.pname} | <strong>ID:</strong> {patient?.pid}
          </Typography>
        </Box>

        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : tests.length === 0 ? (
          <Typography variant="h6" color="textSecondary" align="center" sx={{ mt: 4 }}>
            No pending tests found for {patient?.pname}.
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#2c3e50' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Test Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Normal Range</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    {mode === 'details' ? 'Action' : 'Upload Report'}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tests.map((t) => (
                  <TableRow key={t._id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{t.tname}</TableCell>
                    <TableCell>
                      {new Date(t.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>{t.n_range}</TableCell>
                    
                    <TableCell sx={{ minWidth: 250 }}>
                      {mode === 'details' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            size="small"
                            label="Enter Sample/Patient Details"
                            value={details[t._id] || ""}
                            onChange={(e) => setDetails({ ...details, [t._id]: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                          />
                          <Button variant="contained" color="primary" size="small" onClick={() => handleTakeTest(t._id)}>
                            Take Sample
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            size="small"
                            label="Upload PDF Report"
                            type="file"
                            slotProps={{ htmlInput: { accept: ".pdf" }, inputLabel: { shrink: true } }}
                            onChange={(e) => setFiles({ ...files, [t._id]: e.target.files[0] })}
                            fullWidth
                          />
                          <TextField
                            size="small"
                            label="Patient Result/Range"
                            value={details[t._id] || ""}
                            onChange={(e) => setDetails({ ...details, [t._id]: e.target.value })}
                            fullWidth
                          />
                          <Button variant="contained" color="success" size="small" onClick={() => handleUploadReport(t._id)}>
                            Upload & Complete
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button variant="outlined" fullWidth color="inherit" onClick={handleGoBack} sx={{ height: "6vh", fontWeight: "bold", fontSize: "1.1rem" }}>
          Go Back
        </Button>
      </Box>
    </Box>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function PatientTestsPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Patient Lab Processing
      </Typography>

      <Grid container justifyContent="center" mt={3}>
        <Grid size={{ xs: 12, md: 8, lg: 6 }}>
          <Card sx={{ height: '75vh', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
            
            <Tabs
              value={tabValue}
              indicatorColor="primary"
              textColor="primary"
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}
            >
              <Tab label="1. Take Sample Details" sx={{ fontWeight: 'bold' }} />
              <Tab label="2. Add Test Results" sx={{ fontWeight: 'bold' }} />
            </Tabs>

            {/* Mount completely isolated instances of the workflow tab */}
            {tabValue === 0 && <LabWorkflowTab mode="details" />}
            {tabValue === 1 && <LabWorkflowTab mode="results" />}

          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
PatientTestsPage.layout = 'dashboard';
PatientTestsPage.allowedRoles = ['admin', 'lab_technician'];