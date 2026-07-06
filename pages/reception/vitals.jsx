import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Grid from '@mui/material/Grid2';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Button,
  Autocomplete,
  Card,
  CardContent,
  Typography,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  CircularProgress
} from '@mui/material/';
import DeleteIcon from '@mui/icons-material/Delete';
import { apis } from '../../services/commonServices';

// ==========================================
// UTILS (Co-located for simplicity)
// ==========================================
const arr1 = ['pid', 'pname', 'mobile', 'dname', 'time', 'weight', "height", 'doctor_qs'];
const tableHeaders = ["Patient ID", "Patient Name", "Mobile", "Doctor Name", "Time"];
const initialValues = arr1.reduce((obj, key) => ({ ...obj, [key]: '' }), {});

// ==========================================
// COMPONENT 1: Vitals & Confirmation Modal
// ==========================================
const VitalsModal = ({ open, handleClose, handleEdit, appoint }) => {
  const [checkedList, setCheckedList] = useState('');
  const [form, setForm] = useState({ weight: '', height: '' });

  // Reset modal state when it opens with a new appointment
  useEffect(() => {
    if (open && appoint) {
      setForm({ weight: appoint.weight || '', height: appoint.height || '' });
      // Create a string of '0's based on how many questions the doctor has
      setCheckedList("0".repeat(appoint.doctor_qs?.length || 0));
    }
  }, [open, appoint]);

  const handleCheckboxChange = (event, index) => {
    const newCheckedList =
      checkedList.substring(0, index) +
      (event.target.checked ? "1" : "0") +
      checkedList.substring(index + 1);
    setCheckedList(newCheckedList);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!form.weight || !form.height) {
      toast.error("Please fill out both Weight and Height.");
      return;
    }

    const updatedForm = {
      _id: appoint._id,
      weight: form.weight,
      height: form.height,
      selected_doctor_qs: checkedList,
    };
    
    handleEdit(updatedForm);
  };

  if (!appoint) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Vitals for <strong>{appoint.pname}</strong> ({appoint.time})
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              margin="dense"
              name="weight"
              label="Weight (kg)"
              type="number"
              variant="outlined"
              value={form.weight}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              margin="dense"
              name="height"
              label="Height (cm)"
              type="number"
              variant="outlined"
              value={form.height}
              onChange={handleInputChange}
            />
          </Grid>
        </Grid>

        {appoint.doctor_qs?.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Pre-Consultation Checklist:
            </Typography>
            {appoint.doctor_qs.map((q, index) => (
              <FormControlLabel
                key={index}
                sx={{ display: 'block' }}
                control={
                  <Checkbox
                    checked={checkedList[index] === '1'}
                    onChange={(event) => handleCheckboxChange(event, index)}
                  />
                }
                label={q}
              />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="success">
          Confirm Arrival
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function VitalsPage() {
  const [patValues, setPatValues] = useState(initialValues);
  const [pData, setPData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  // Note: Hardcoded 'cardiology' to match your original code.
  // In the future, this should probably come from the logged-in user's department!
  // const fetchData = async (dep = 'cardiology') => {
  //   try {
  //     const data = await apis.noTokengetRequest(`/appointment/getapp/${dep}`);
  //     setPData(data || []);
  //     setFilteredData(data || []);
  //   } catch (error) {
  //     toast.error("Failed to fetch appointments.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   fetchData();
  // }, []);

  // Handle Search/Filtering
  const handleSearch = (newValue, index) => {
    if (newValue) {
      const searchKey = index === 1 ? 'pid' : 'pname';
      const targetApp = pData.find((e) => e[searchKey] === newValue);
      
      if (targetApp) {
        setPatValues({ ...patValues, pid: targetApp.pid, mobile: targetApp.mobile, pname: targetApp.pname });
        setFilteredData(pData.filter((m) => m[searchKey].toLowerCase().includes(newValue.toLowerCase())));
      }
    } else {
      setPatValues({ ...patValues, pid: '', mobile: '', pname: '' });
      setFilteredData(pData);
    }
  };

  // Reusable Autocomplete UI
  const renderAutoComp = (property, label, index) => (
    <Autocomplete
      freeSolo
      options={pData.map((option) => option[property])}
      onChange={(event, newValue) => handleSearch(newValue, index)}
      value={patValues[property] || null}
      renderInput={(params) => (
        <TextField {...params} label={`Search by ${label}`} variant="outlined" size="small" fullWidth />
      )}
    />
  );

  // Delete Action
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      const status = await apis.noTokenStatusDeleteRequest('/appointment', id);
      if (status === 200) {
        toast.success("Appointment Cancelled");
        const updatedData = pData.filter(e => e._id !== id);
        setPData(updatedData);
        setFilteredData(updatedData);
      }
    }
  };

  // Edit Action (Triggered by Modal)
  const handleEdit = async (updatedForm) => {
    try {
      const status = await apis.noTokenStatusPutRequest('/appointment', updatedForm);
      if (status === 200) {
        toast.success("Patient Confirmed & Vitals Saved");
        // Remove the confirmed appointment from the waiting list
        const updatedData = pData.filter(e => e._id !== updatedForm._id);
        setPData(updatedData);
        setFilteredData(updatedData);
        setOpenEditModal(false);
      }
    } catch (error) {
      toast.error("Failed to save vitals.");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Patient Vitals & Confirmation
      </Typography>

      <Card sx={{ mt: 3, boxShadow: 3, minHeight: '75vh' }}>
        <CardContent>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              {renderAutoComp('pid', "Patient ID", 1)}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {renderAutoComp('pname', "Patient Name", 0)}
            </Grid>
          </Grid>

          <TableContainer sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {tableHeaders.map((header, idx) => (
                    <TableCell key={idx} sx={{ backgroundColor: '#2c3e50', color: 'white', fontWeight: 'bold' }}>
                      {header}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ backgroundColor: '#2c3e50', color: 'white', fontWeight: 'bold' }}>
                    Capture Vitals
                  </TableCell>
                  <TableCell align="center" sx={{ backgroundColor: '#2c3e50', color: 'white', fontWeight: 'bold' }}>
                    Cancel Appt
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((m) => (
                    <TableRow key={m._id} hover>
                      <TableCell>{m.pid}</TableCell>
                      <TableCell>{m.pname}</TableCell>
                      <TableCell>{m.mobile}</TableCell>
                      <TableCell>{m.dname}</TableCell>
                      <TableCell>{m.time}</TableCell>
                      <TableCell align="center">
                        <Button 
                          variant="contained" 
                          color="success" 
                          size="small"
                          onClick={() => {
                            setSelectedApp(m);
                            setOpenEditModal(true);
                          }}
                        >
                          Confirm
                        </Button>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={() => handleDelete(m._id)} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography sx={{ py: 3 }} color="textSecondary">No pending appointments found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* MODAL IS MOUNTED OUTSIDE THE TABLE */}
      <VitalsModal
        open={openEditModal}
        handleClose={() => setOpenEditModal(false)}
        handleEdit={handleEdit}
        appoint={selectedApp}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
VitalsPage.layout = 'dashboard';
VitalsPage.allowedRoles = ['admin', 'receptionist', 'nurse'];