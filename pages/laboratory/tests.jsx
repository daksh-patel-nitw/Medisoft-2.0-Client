import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  TablePagination,
  Autocomplete,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { toast } from 'react-toastify';

// Make sure these paths match your project structure!
import { apis } from '../../services/commonServices';
import TimingsPicker from '../../components/TimingsAutoComp';

export default function ManageTestsPage() {
  const [tests, setTests] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Inline Edit State
  const [editRowId, setEditRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    price: '',
    pat_details: '',
    normal: '',
    timing: []
  });

  // Fetch Data
  const fetchTests = async () => {
    try {
      const data = await apis.noTokengetRequest('/lab');
      setTests(data || []);
    } catch (error) {
      toast.error("Failed to fetch lab tests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Handle Search
  const handleSearch = (event, newValue) => {
    setSearchValue(newValue || '');
    setPage(0); // Reset to first page on search
  };

  // Pagination Handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Delete Action
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this test?")) {
      try {
        const status = await apis.noTokenStatusDeleteRequest('/lab', id);
        if (status === 200) {
          setTests(tests.filter((m) => m._id !== id));
          toast.success("Test deleted successfully.");
        }
      } catch (error) {
        toast.error("Error deleting test.");
      }
    }
  };

  // ==========================================
  // INLINE EDITING LOGIC
  // ==========================================
  const handleEditClick = (test) => {
    setEditRowId(test._id);
    setEditFormData({
      price: test.price || '',
      pat_details: test.pat_details || '',
      normal: test.normal || '',
      timing: test.timing || []
    });
  };

  const handleCancelClick = () => {
    setEditRowId(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Timings Logic for Inline Editor
  const handleAddTiming = (newTiming) => {
    if (!editFormData.timing.includes(newTiming)) {
      setEditFormData((prev) => ({ ...prev, timing: [...prev.timing, newTiming] }));
    } else {
      toast.info("Timing already added");
    }
  };

  const handleDeleteTiming = (timingToRemove) => {
    setEditFormData((prev) => ({
      ...prev,
      timing: prev.timing.filter((t) => t !== timingToRemove)
    }));
  };

  const handleSaveClick = async (testId) => {
    try {
      // Assuming your backend handles standard object updates for the whole row.
      // If your backend specifically requires `{ column, value, id }`, you will need 
      // to adjust this payload to match your backend expectations!
      const payload = {
        _id: testId,
        price: editFormData.price,
        pat_details: editFormData.pat_details,
        normal: editFormData.normal,
        timing: editFormData.timing
      };

      // Replace '/lab' with your actual update endpoint (e.g., '/lab/update' or just PUT '/lab')
      const status = await apis.noTokenStatusPutRequest('/lab', payload);
      
      if (status === 200) {
        toast.success("Test updated successfully!");
        // Optimistic UI Update
        setTests(tests.map(t => t._id === testId ? { ...t, ...payload } : t));
        setEditRowId(null);
      } else {
        toast.error("Failed to update test.");
      }
    } catch (error) {
      toast.error("Server error while saving.");
    }
  };

  // Filter and Slice Data for Table
  const filteredTests = tests.filter((m) => 
    m.name?.toLowerCase().includes(searchValue.toLowerCase())
  );
  
  const displayedTests = filteredTests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const columns = ["Test Name", "Price (₹)", "Required Details", "Normal Range", "Timings", "Actions"];

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
        Manage Laboratory Tests
      </Typography>

      <Card sx={{ mt: 3, boxShadow: 3, minHeight: '75vh', position: 'relative' }}>
        <CardContent sx={{ pb: 10 }}>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                options={tests.map((option) => option.name)}
                onChange={handleSearch}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search by Test Name"
                    variant="outlined"
                    size="small"
                    onChange={(e) => handleSearch(null, e.target.value)} // Fallback for manual typing
                  />
                )}
              />
            </Grid>
          </Grid>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((col, index) => (
                    <TableCell key={index} sx={{ backgroundColor: '#2c3e50', color: 'white', fontWeight: 'bold' }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedTests.map((m) => {
                  const isEditing = editRowId === m._id;

                  return (
                    <TableRow key={m._id} hover>
                      
                      {/* Name (Non-editable) */}
                      <TableCell sx={{ fontWeight: '500', minWidth: '150px' }}>
                        {m.name}
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            name="price"
                            type="number"
                            value={editFormData.price}
                            onChange={handleFormChange}
                            sx={{ width: '100px' }}
                          />
                        ) : (
                          `₹${m.price}`
                        )}
                      </TableCell>

                      {/* Required Details */}
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            name="pat_details"
                            value={editFormData.pat_details}
                            onChange={handleFormChange}
                            fullWidth
                          />
                        ) : (
                          m.pat_details
                        )}
                      </TableCell>

                      {/* Normal Range */}
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            name="normal"
                            value={editFormData.normal}
                            onChange={handleFormChange}
                            fullWidth
                          />
                        ) : (
                          m.normal
                        )}
                      </TableCell>

                      {/* Timings */}
                      <TableCell sx={{ minWidth: isEditing ? '350px' : '200px' }}>
                        {isEditing ? (
                          <Box sx={{ p: 1, border: '1px dashed #ccc', borderRadius: 1 }}>
                            <TimingsPicker handleAdd={handleAddTiming} />
                            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {editFormData.timing.map((t, idx) => (
                                <Chip 
                                  key={idx} 
                                  label={t} 
                                  size="small" 
                                  onDelete={() => handleDeleteTiming(t)} 
                                  color="primary" 
                                  variant="outlined" 
                                />
                              ))}
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {m.timing?.map((t, index) => (
                              <Typography key={index} variant="body2">
                                <strong>{index + 1})</strong> {t}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        {isEditing ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button variant="contained" color="success" size="small" onClick={() => handleSaveClick(m._id)}>
                              Save
                            </Button>
                            <Button variant="outlined" color="inherit" size="small" onClick={handleCancelClick}>
                              Cancel
                            </Button>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton onClick={() => handleEditClick(m)} color="primary" size="small">
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(m._id)} color="error" size="small">
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>

                    </TableRow>
                  );
                })}

                {displayedTests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No laboratory tests found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>

        {/* Bottom Fixed Pagination */}
        <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, borderTop: '1px solid #e0e0e0', bgcolor: 'background.paper' }}>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredTests.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
ManageTestsPage.layout = 'dashboard';
ManageTestsPage.allowedRoles = ['admin', 'laboratory'];