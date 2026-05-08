import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Card,
  CardContent,
  Grid2 as Grid, // Use standard Grid import alias for clarity
  Typography,
  Box,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Button
} from '@mui/material';
import MedicationIcon from "@mui/icons-material/Medication";
import { Delete, Edit, Save, Cancel } from '@mui/icons-material';
import { debounce } from '@mui/material/utils';
import { toast } from 'react-toastify';
import { apis } from '../../services/commonServices';
import useMedicineStore from '../../store/useMedicineStore'; // <-- Reusing our Zustand store!

// ==========================================
// COMPONENT 1: The Medicine Autocomplete
// ==========================================
const InventoryAutocomplete = ({ setHasMore, setFilteredString, setFilteredMedicines }) => {
  const [value, setValue] = useState(null);
  const [options, setOptions] = useState([]);

  // Zustand
  const inputValue = useMedicineStore((state) => state.medicineInputValue);
  const setMedicineInputValue = useMedicineStore((state) => state.setMedicineInputValue);

  // Debounced Search
  const fetchMedicines = useMemo(
    () =>
      debounce(async (query, active) => {
        if (!query) return;
        try {
          const response = await apis.noTokengetRequest(`/pharmacy/search?query=${query}`);
          if (active) {
            setOptions(response || []);
            if (response.length > 0) {
              setFilteredMedicines(response);
            }
          }
        } catch (error) {
          // THE FIX: Add the toast and gracefully set empty options
          console.error('Error fetching medicines:', error);
          toast.error("Network Error: Could not search medicines.");
          setOptions([]); 
        }
      }, 500),
    [setFilteredMedicines]
  );

  useEffect(() => {
    let active = true;

    if (inputValue === '') {
      setValue(null);
      setOptions(value ? [value] : []);
      setHasMore(true);
      return;
    }

    if (inputValue.length >= 3) {
      setFilteredString(inputValue);
      fetchMedicines(inputValue, active);
    } else {
      setFilteredString('');
    }

    return () => {
      active = false;
    };
  }, [inputValue, fetchMedicines, setFilteredString, setHasMore, value]);

  return (
    <Autocomplete
      getOptionLabel={(option) => option.name || ''}
      options={options}
      autoComplete
      includeInputInList
      filterSelectedOptions
      value={value}
      noOptionsText="No medicines found"
      onChange={(event, newValue) => {
        setHasMore(false);
        setFilteredMedicines(newValue ? [newValue] : []);
        setValue(newValue);
      }}
      onInputChange={(event, newInputValue) => {
        // Only alphanumeric and spaces
        if (/^[a-zA-Z0-9 ]*$/.test(newInputValue)) {
          setMedicineInputValue(newInputValue);
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label="Search Medicines (Enter 3 letters)" fullWidth size="small" />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option._id}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <MedicationIcon sx={{ color: 'text.secondary', mr: 1 }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {option.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Per {option.t} - ₹{option.price?.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </li>
      )}
    />
  );
};

// ==========================================
// COMPONENT 2: The Inline-Edit Table
// ==========================================
const MedicinesTable = ({ hasMore, lastElementRef, medicines, handleDelete, setMedicines }) => {
  const columns = ["Medicine Name", "Type", "Package Size", "Pack Stock", "Loose Pcs", "Price (₹)", "Actions"];
  
  // Track which row is currently being edited
  const [editRowId, setEditRowId] = useState(null);
  
  // Temporary state for the row being edited
  const [editFormData, setEditFormData] = useState({ ps: '', ps_u: '', price: '' });

  const handleEditClick = (medicine) => {
    setEditRowId(medicine._id);
    // Initialize the form with current values
    setEditFormData({
      ps: medicine.ps,
      ps_u: medicine.ps_u,
      price: medicine.price
    });
  };

  const handleCancelClick = () => {
    setEditRowId(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = async (medicine) => {
    // Basic validation
    if (!editFormData.ps || !editFormData.ps_u || !editFormData.price) {
      toast.error("Values cannot be empty");
      return;
    }

    try {
      // Create payload. Assuming your backend accepts these fields for update
      const payload = {
        _id: medicine._id,
        ps: Number(editFormData.ps),
        ps_u: Number(editFormData.ps_u), // If they are ADDING stock, you might need to handle math here before sending
        price: Number(editFormData.price)
      };

      // Call your API (Replace with your actual PUT/POST route)
      // await apis.noTokenStatusPutRequest('/pharmacy/update', payload); 
      
      // Optimistic UI Update (Update the local array so we don't have to refetch)
      setMedicines(prevMedicines => 
        prevMedicines.map(m => 
          m._id === medicine._id 
            ? { ...m, ...payload } 
            : m
        )
      );

      toast.success("Inventory updated successfully!");
      setEditRowId(null); // Exit edit mode
    } catch (error) {
      toast.error("Failed to update inventory.");
      console.error(error);
    }
  };

  return (
    <TableContainer sx={{ maxHeight: '60vh' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {columns.map((element, index) => (
              <TableCell key={index} sx={{ backgroundColor: '#2c3e50', color: 'white', fontWeight: 'bold' }}>
                {element}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {medicines.map((m) => {
            const isEditing = editRowId === m._id;

            return (
              <TableRow key={m._id} hover>
                {/* Non-editable columns */}
                <TableCell sx={{ fontWeight: '500' }}>{m.name}</TableCell>
                <TableCell>{m.t}</TableCell>

                {/* Editable columns */}
                <TableCell>
                  {isEditing ? (
                    <TextField 
                      size="small" 
                      name="ps" 
                      type="number" 
                      value={editFormData.ps} 
                      onChange={handleFormChange} 
                      sx={{ width: 80 }}
                    />
                  ) : m.ps}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <TextField 
                      size="small" 
                      name="ps_u" 
                      type="number" 
                      value={editFormData.ps_u} 
                      onChange={handleFormChange} 
                      sx={{ width: 80 }}
                      helperText={isEditing ? "Total Packs" : ""}
                    />
                  ) : m.ps_u}
                </TableCell>
                
                {/* Calculated Column (Loose pieces) */}
                <TableCell>{isEditing ? "—" : (m.ps_c + (m.ps_u * m.ps))}</TableCell>

                <TableCell>
                  {isEditing ? (
                    <TextField 
                      size="small" 
                      name="price" 
                      type="number" 
                      value={editFormData.price} 
                      onChange={handleFormChange} 
                      sx={{ width: 80 }}
                    />
                  ) : `₹${m.price}`}
                </TableCell>

                {/* Actions Column */}
                <TableCell>
                  {isEditing ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" color="success" size="small" onClick={() => handleSaveClick(m)}>
                        Save
                      </Button>
                      <Button variant="outlined" color="inherit" size="small" onClick={handleCancelClick}>
                        Cancel
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex' }}>
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

          {hasMore && (
            <TableRow ref={lastElementRef}>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          )}

          {!hasMore && medicines.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No medicines found in inventory.</Typography>
              </TableCell>
            </TableRow>
          )}

        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function InventoryPage() {
  const [medicines, setMedicines] = useState([]);
  const [filteredString, setFilteredString] = useState('');
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const observer = useRef();

  // Fetch paginated medicines
  const fetchData = useMemo(() => debounce(async (pageNumber, searchString) => {
    if (loading || (!hasMore && pageNumber !== 1)) return;

    setLoading(true);
    try {
      const response = await apis.noTokengetRequest(`/pharmacy?page=${pageNumber}&limit=15&query=${searchString}`);
      
      if (response && response.medicines) {
        if (pageNumber === 1) {
          setMedicines(response.medicines);
        } else {
          setMedicines((prev) => [...prev, ...response.medicines]);
        }
        setHasMore(pageNumber < response.totalPages);
      }
    } catch (error) {
      // THE FIX: Show the toast, and tell the infinite scroller to stop trying
      console.error("Error fetching medicines:", error);
      toast.error("Network Error: Failed to load inventory.");
      setHasMore(false); // Stops the table from infinitely spinning if the server is down
    } finally {
      setLoading(false);
    }
  }, 500), [loading, hasMore]);
  
  // Handle Initial Load and Page Changes
  useEffect(() => {
    fetchData(page, filteredString);
  }, [page, filteredString, fetchData]); // added fetchData to dependency array

  // Keep filtered list synced when main list updates (if no search is active)
  useEffect(() => {
    if (filteredString === '') {
      setFilteredMedicines(medicines);
    }
  }, [medicines, filteredString]);


  // Handle Delete
  const handleDelete = useCallback(async (id) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
       try {
         // await apis.noTokenStatusDeleteRequest('/pharmacy', id);
         setMedicines(prev => prev.filter(m => m._id !== id));
         toast.success("Medicine deleted.");
       } catch (error) {
         toast.error("Failed to delete.");
       }
    }
  }, []);

  // Infinite Scroll Observer
  const lastElementRef = useCallback((node) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPage((prevPage) => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [hasMore, loading]);

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Pharmacy Inventory
      </Typography>
      
      <Card sx={{ mt: 3, boxShadow: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            
            {/* Search Bar */}
            <Grid size={{ xs: 12 }}>
              <InventoryAutocomplete 
                setHasMore={setHasMore} 
                setFilteredString={setFilteredString} 
                setFilteredMedicines={setFilteredMedicines} 
              />
            </Grid>

            {/* Main Table */}
            <Grid size={{ xs: 12 }}>
              <MedicinesTable  
                hasMore={hasMore} 
                lastElementRef={lastElementRef} 
                medicines={filteredMedicines} 
                setMedicines={setFilteredMedicines} // Pass setter down so table can update it inline
                handleDelete={handleDelete} 
              />
            </Grid>

          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
InventoryPage.layout = 'dashboard';
InventoryPage.allowedRoles = ['admin', 'pharmacist'];