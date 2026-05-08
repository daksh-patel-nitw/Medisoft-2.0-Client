import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Chip, 
  Box 
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { toast } from 'react-toastify';

// Make sure these utilities and components exist in your project!
import { apis } from '../../services/commonServices';
import TimingsPicker from '../../components/TimingsAutoComp';
import { arr1, arr2, initialTestState } from '../../utils/labUtils'; // Adjust path as needed

export default function AddLabTestPage() {
  const [formValues, setFormValues] = useState(initialTestState);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const addTiming = (newTiming) => {
    if (!formValues.timing.includes(newTiming)) {
      setFormValues(prev => ({ ...prev, timing: [...prev.timing, newTiming] }));
    } else {
      toast.info("Timing already added");
    }
  };

  const deleteTiming = (timingToRemove) => {
    setFormValues(prev => ({ 
      ...prev, 
      timing: prev.timing.filter(time => time !== timingToRemove) 
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!formValues.timing || formValues.timing.length === 0) {
      toast.warn("Please add at least one timing slot.");
      return;
    }

    try {
      const status = await apis.noTokenStatusPostRequest('/lab', formValues);
      if (status === 200) {
        toast.success("New Lab Test added successfully!");
        setFormValues(initialTestState); // Reset form
      } else {
        toast.error("Failed to add test. Please try again.");
      }
    } catch (error) {
      toast.error("Server error. Could not add test.");
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Laboratory Setup
      </Typography>

      <form onSubmit={handleSubmit} autoComplete="off">
        <Grid container spacing={2} justifyContent="center">
          <Grid size={{ xs: 12, md: 10, lg: 8 }}>
            <Card sx={{ position: "relative", minHeight: "75vh", boxShadow: 3 }}>
              <CardContent sx={{ pb: 10 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                  Add New Test Profile
                </Typography>

                <Grid container spacing={3}>
                  {arr1.map((fieldName, index) => (
                    <React.Fragment key={fieldName}>
                      
                      {/* Standard Fields */}
                      {index !== 4 && (
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            name={fieldName}
                            id={fieldName}
                            label={arr2[index]}
                            variant="outlined"
                            value={formValues[fieldName] || ''}
                            type={index === 1 ? "number" : "text"} // Assuming index 1 is Price/Cost
                            onChange={handleInputChange}
                            required
                            size="small"
                          />
                        </Grid>
                      )}

                      {/* Timings Field (Assuming index 4 is timings based on your code) */}
                      {index === 4 && (
                        <Grid container size={{ xs: 12 }} spacing={2} alignItems="stretch">
                          <Grid size={{ xs: 12, md: 5 }}>
                            <TimingsPicker handleAdd={addTiming} />
                          </Grid>
                          
                          <Grid 
                            container 
                            size={{ xs: 12, md: 7 }} 
                            sx={{ 
                              border: '1px solid #ccc', 
                              borderRadius: 1, 
                              p: 2,
                              minHeight: '56px',
                              alignItems: 'flex-start',
                              alignContent: 'flex-start'
                            }} 
                            spacing={1}
                          >
                            {formValues.timing?.length > 0 ? (
                              formValues.timing.map((time, idx) => (
                                <Grid key={idx}>
                                  <Chip 
                                    label={time} 
                                    color="primary"
                                    variant="outlined" 
                                    onDelete={() => deleteTiming(time)} 
                                  />
                                </Grid>
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ width: '100%', textAlign: 'center', mt: 1 }}>
                                No Timings Added
                              </Typography>
                            )}
                          </Grid>
                        </Grid>
                      )}
                    </React.Fragment>
                  ))}
                </Grid>
              </CardContent>

              {/* Bottom Fixed Action Button */}
              <Grid container sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'background.paper', borderTop: '1px solid #e0e0e0' }}>
                <Grid size={{ xs: 12 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ height: "6vh", fontWeight: "bold", fontSize: "1.1rem" }}
                  >
                    Save New Test
                  </Button>
                </Grid>
              </Grid>

            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
AddLabTestPage.layout = 'dashboard';
AddLabTestPage.allowedRoles = ['admin', 'laboratory'];