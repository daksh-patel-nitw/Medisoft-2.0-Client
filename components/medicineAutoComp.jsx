import React, { useState, useMemo, useEffect } from 'react';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';
import { debounce } from '@mui/material/utils';
import MedicationIcon from "@mui/icons-material/Medication";
import { apis } from '../services/commonServices';
import useMedicineStore from '../store/useMedicineStore'; // <-- Import Zustand Store

export const MedicineAutocomplete = ({ index, setHasMore, setFilteredString, setFilteredMedicines, setMedicine }) => {
  const [value, setValue] = useState(null);
  const [options, setOptions] = useState([]);
  const [error, setError] = useState(false);

  // ZUSTAND: Grab the state and the action directly
  const inputValue = useMedicineStore((state) => state.medicineInputValue);
  const setMedicineInputValue = useMedicineStore((state) => state.setMedicineInputValue);

  // Debounce API Call
  const fetchMedicines = useMemo(
    () =>
      debounce(async (query, active) => {
        if (!query) return;
        try {
          const response = await apis.noTokengetRequest(`/pharmacy/search?query=${query}`);
          
          if (active) {
            setOptions(response || []);

            // We don't need to update the filtered medicines for the doctor screen tab
            if (index === 1) return;

            if (response.length > 0 && setFilteredMedicines) {
               setFilteredMedicines(response);
            }
          }
        } catch (error) {
          console.error('Error fetching medicines:', error);
        }
      }, 500), 
    [index, setFilteredMedicines]
  );

  useEffect(() => {
    let active = true;

    if (inputValue === '') {
      setValue(null);
      setOptions(value ? [value] : []);
      if (index !== 1 && setHasMore) setHasMore(true);
      return;
    }

    if (inputValue.length >= 3) {
      if (index !== 1 && setFilteredString) setFilteredString(inputValue);
      fetchMedicines(inputValue, active);
    } else {
      if (index !== 1 && setFilteredString) setFilteredString('');
    }

    return () => {
      active = false;
    };
  }, [inputValue, fetchMedicines, index, setFilteredString, setHasMore, value]);

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
        setValue(newValue);
        if (index === 1) {
          if (setMedicine) setMedicine(newValue);
          return;
        }
        if (setHasMore) setHasMore(false);
        if (setFilteredMedicines) setFilteredMedicines(newValue ? [newValue] : []);
      }}
      onInputChange={(event, newInputValue) => {
        // Regex: Only alphanumeric and spaces allowed
        const isValid = /^[a-zA-Z0-9 ]*$/.test(newInputValue);
        setError(!isValid);
        
        if (isValid) {
          // ZUSTAND: Update the global state
          setMedicineInputValue(newInputValue);
        }
      }}
      renderInput={(params) => (
        <TextField 
          {...params} 
          error={error} 
          label={error ? "Don't use special Characters" : "Search Medicines"} 
          fullWidth 
          size="small" // Highly recommended for Dashboards
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option._id || option.name}>
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