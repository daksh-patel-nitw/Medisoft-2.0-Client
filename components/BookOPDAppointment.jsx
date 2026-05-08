import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Autocomplete,
  Typography,
  Box
} from '@mui/material';
import PersonIcon from "@mui/icons-material/Person";
import { toast } from 'react-toastify';
import { apis } from '../Services/commonServices';
import usePatientStore from '../store/usePatientStore'; // <-- Import Zustand Store

// Appointment Form Values
const arr1 = ['pph', 'did', 'dname', 'dep', 'schedule_date', 'time', 'qs', 'count', 'price'];

const initialValues = arr1.reduce(
  (obj, key) => ({ ...obj, [key]: '' }),
  {}
);

export default function BookOPDAppointment({ index, patient, setPatient, part, setPart, setOpd }) {
  // ZUSTAND: Grab the clear function
  const clearPatient = usePatientStore((state) => state.clearPatient);

  // Component State
  const [count, setC] = useState({});
  const [doctors, setDoc] = useState([]);
  const [formV, setForm] = useState(initialValues);
  const [Timings, setT] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');

  // Fetch doctors on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const d_data = await apis.noTokengetRequest('/member/doctors');
        setDoc(d_data || []);
      } catch (error) {
        console.error("Failed to fetch doctors", error);
      }
    };
    fetchData();
  }, []);

  // Handle Doctor Search (Part 1)
  const handleSearch = (newValue) => {
    if (newValue) {
      const { _id, timings, ...rest } = newValue;
      setForm({ ...formV, ...rest });
      setT(timings || []);
    } else {
      setForm(initialValues);
      setT([]);
    }
  };

  // Clear all values
  const clearValues = () => {
    const newValues = {};
    Object.keys(formV).forEach((key) => {
      newValues[key] = key === 'schedule_date' ? 'Select Date' : '';
    });
    setT([]);
    setC({});
    setForm(newValues);
    setSelectedDate('');
    
    // ZUSTAND: Clear global patient state
    clearPatient();
    
    if (index === 1 && setPatient) setPatient(null);
  };

  // Handle Radio Button Changes (Part 2)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prevForm => ({
      ...prevForm,
      [name]: value,
      count: name === "time" ? count[value] : prevForm.count
    }));
  };

  // Date Logic
  const isBeforeToday = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
  };

  const handleDateChange = async (event) => {
    const date = event.target.value;
    if (!isBeforeToday(date)) {
      setSelectedDate(date);
      setForm({ ...formV, schedule_date: date });
      
      try {
        const link = `/member/doctorTiming/${date}/${formV.did}`;
        const res = await apis.noTokengetRequest(link);

        if (res && res.length > 0) {
          const resMap = res.reduce((acc, { timing, bookedCount }) => {
            acc[timing] = bookedCount;
            return acc;
          }, {});

          const updatedCount = Timings.reduce((acc, timing) => {
            acc[timing] = resMap[timing] != null ? resMap[timing] : formV.pph;
            return acc;
          }, {});
          setC(updatedCount);
        } else {
          const defaultCount = Object.fromEntries(Timings.map(t => [t, formV.pph]));
          setC(defaultCount);
        }
      } catch (error) {
        console.error("Failed to fetch timings", error);
      }
    }
  };

  // Next / Submit button logic
  const handleNext = async () => {
    if (part === 1 && !formV.did) {
      toast.error("Please select a Doctor first.");
      return;
    }

    if (part === 2 && formV.schedule_date) {
      try {
        await apis.noTokenPostRequest('/appointment', { ...formV, ...patient });
        toast.success("Appointment Booked Successfully!");
        if (index === 0 && setOpd) setOpd(formV.dname);
        clearValues();
      } catch (error) {
        toast.error("Failed to book appointment.");
      }
    }
    
    setPart((prev) => (prev + 1) % 3);
  };

  return (
    <Grid container justifyContent="center" spacing={2}>
      <Card sx={{ position: "relative", width: { md: "50%", xs: "100%" }, minHeight: "65vh", boxShadow: 3 }}>
        <CardContent sx={{ pb: 10 }}>
          
          {/* ============================== */}
          {/* PART 1: SELECT DOCTOR          */}
          {/* ============================== */}
          {part === 1 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="h5" fontWeight="bold">Doctor Details</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  autoComplete
                  noOptionsText="No Doctors found"
                  options={doctors}
                  getOptionLabel={(option) => option.dname || ''}
                  filterSelectedOptions
                  onChange={(event, newValue) => handleSearch(newValue)}
                  value={formV.did ? formV : null}
                  renderInput={(params) => (
                    <TextField {...params} label="Search Doctor" margin='normal' variant='outlined' />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {option.dname}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Department: {option.dep}
                          </Typography>
                        </Box>
                      </Box>
                    </li>
                  )}
                />
              </Grid>
            </Grid>
          )}

          {/* ============================== */}
          {/* PART 2: CALENDAR & TIMINGS     */}
          {/* ============================== */}
          {part === 2 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle1"><strong>Doctor:</strong> {formV.dname}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle1"><strong>Dept:</strong> {formV.dep}</Typography>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                {selectedDate && (
                  <Typography variant="h6" color="primary" gutterBottom>
                    Date: {new Date(formV.schedule_date).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'long', day: 'numeric', year: 'numeric' })}
                  </Typography>
                )}
                
                <TextField
                  fullWidth
                  label="Select Date"
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: {
                      min: new Date().toISOString().split("T")[0],
                    }
                  }}
                />
              </Grid>

              {selectedDate && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Select Timing:</Typography>
                  <RadioGroup name="time" value={formV.time} onChange={handleInputChange}>
                    {Timings.length > 0 ? (
                      Timings.map((timeSlot) => (
                        <FormControlLabel
                          key={timeSlot}
                          value={timeSlot}
                          control={<Radio required />}
                          label={`${timeSlot} (Slots available: ${count[timeSlot] || 0})`}
                          disabled={count[timeSlot] === 0}
                        />
                      ))
                    ) : (
                      <Typography color="text.secondary">No timings available for this date.</Typography>
                    )}
                  </RadioGroup>
                </Grid>
              )}
            </Grid>
          )}

        </CardContent>

        {/* ============================== */}
        {/* ACTION BUTTONS (BOTTOM FIXED)  */}
        {/* ============================== */}
        <Grid container spacing={2} sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'background.paper', borderTop: '1px solid #e0e0e0' }}>
          
          {(index === 1 || (part === 2 && index === 0)) && (
            <Grid size={{ xs: 6 }}>
              <Button 
                variant="outlined" 
                fullWidth 
                color="primary"
                onClick={() => {
                  setPart((prev) => (prev - 1) % 3);
                  if (part === 1) {
                    setForm(initialValues);
                    setT([]);
                  }
                  if (part === 2) {
                    setSelectedDate('');
                    setForm({ ...formV, schedule_date: '' });
                  }
                }}
                sx={{ height: "6vh", fontWeight: "bold", fontSize: "1.1rem" }}
              >
                Back
              </Button>
            </Grid>
          )}

          <Grid size={{ xs: (index === 1 ? ([1, 2].includes(part) ? 6 : 12) : (part === 2 ? 6 : 12)) }}>
            <Button 
              variant="contained" 
              fullWidth 
              color="primary" 
              onClick={handleNext}
              sx={{ height: "6vh", fontWeight: "bold", fontSize: "1.1rem" }}
              disabled={part === 2 && !formV.time}
            >
              {part === 1 ? "Next" : "Book Appointment"}
            </Button>
          </Grid>
        </Grid>

      </Card>
    </Grid>
  );
}