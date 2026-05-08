import React, { useState, useMemo, useEffect } from 'react';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';
import { debounce } from '@mui/material/utils';
import PersonIcon from "@mui/icons-material/Person";
import { apis } from '../Services/commonServices';
import usePatientStore from '../store/usePatientStore'; // <-- Import Zustand Store

const arr = ["pname", "pid", "mobile"];
const arr2 = ["Name", "ID", "Mobile"];

export const PatientAutocomplete = ({ index, setPatient, patient, opd }) => {
  const [value, setValue] = useState(null);
  const [isManualInput, setIsManualInput] = useState(false);
  const [error, setError] = useState(false);

  // ZUSTAND: Extract state and actions directly
  const inputValues = usePatientStore((state) => state.inputValues);
  const options = usePatientStore((state) => state.options);
  const activeAutoComplete = usePatientStore((state) => state.activeAutoComplete);
  
  const setPatientOptions = usePatientStore((state) => state.setPatientOptions);
  const clearPatient = usePatientStore((state) => state.clearPatient);
  const setActiveAutoComplete = usePatientStore((state) => state.setActiveAutoComplete);
  const setPatientAutoComp = usePatientStore((state) => state.setPatientAutoComp);

  useEffect(() => {
    setValue(patient);
  }, [patient]);

  // Debounce API Call
  const fetchPatients = useMemo(
    () =>
      debounce(async (query, active) => {
        if (!query) return;
        try {
          // opd flag determines if we are fetching for OPD registration vs General
          const response = await apis.noTokengetRequest(`/member/patient?search=${query.toString()}&flag=${index}&opd=${opd ? 1 : 0}`);
          
          if (active) {
            setPatientOptions(response || []); // Store in Zustand
          }
        } catch (err) {
          console.error('Error fetching patients:', err);
        }
      }, 500),
    [index, opd, setPatientOptions]
  );

useEffect(() => {
    let active = true;
    
    // Safely get the current input value for this specific field index
    const currentInputString = inputValues[arr[index - 1]];

    // ----------------------------------------------------
    // THE FIX: Remove clearPatient() from here!
    // ----------------------------------------------------
    if (!currentInputString || currentInputString === '') {
      setValue(null);
      // We rely on the `onChange` handler further down to call clearPatient()
      // when the user actually clicks the 'X' button to clear the field.
      return;
    }

    if (isManualInput && activeAutoComplete === index) {
      if (index === 3) {
        if (currentInputString.length >= 5) {
          fetchPatients(currentInputString, active);
        }
      } else if (currentInputString.length >= 3) {
        fetchPatients(currentInputString, active);
      }
    }

    return () => {
      active = false;
    };
  // Also remove clearPatient from the dependency array below:
  }, [inputValues, isManualInput, activeAutoComplete, index, fetchPatients]);
  // Determine which other two fields to display in the subtitle
  const others = [1, 2, 3].filter(i => i !== index);

  const getErrMsg = (idx) => {
    switch (idx) {
      case 1: return "Characters allowed are A-Z, a-z and spaces";
      case 2: return "Characters allowed are A-Z, 0-9";
      case 3: return "Only numbers are allowed";
      default: return "";
    }
  };

  return (
    <Autocomplete
      getOptionLabel={(option) => option[arr[index - 1]]?.toString() || ''}
      options={options}
      autoComplete
      includeInputInList
      filterSelectedOptions
      value={value}
      noOptionsText="No patients found"
      onChange={(event, newValue) => {
        setValue(newValue);
        if (setPatient) setPatient(newValue);
        setIsManualInput(false);
        
        if (!newValue) {
          clearPatient();
        }
        
        setActiveAutoComplete(null); // Reset active field after selection
      }}
      onInputChange={(event, newInputValue) => {
        const isValid = (() => {
          switch (index) {
            case 1: return /^[a-zA-Z ]*$/.test(newInputValue); // Name
            case 2: return /^[A-Z0-9]*$/.test(newInputValue); // ID
            case 3: return /^[0-9]*$/.test(newInputValue); // Mobile
            default: return false;
          }
        })();
        
        setError(!isValid);
        
        if (isValid) {
          // ZUSTAND: Update specific field in the global store
          setPatientAutoComp(arr[index - 1], newInputValue);
          setIsManualInput(true);
        }
      }}
      onFocus={() => setActiveAutoComplete(index)} // Set active on focus
      renderInput={(params) => (
        <TextField
          {...params}
          error={error}
          label={error ? getErrMsg(index) : `Search Patient ${arr2[index - 1]}`}
          fullWidth
          size="small" // Keeps the UI clean and enterprise-looking
          helperText={
            error 
              ? "Don't use special Characters" 
              : index === 3 ? "Enter at least 5 digits" : "Enter at least 3 characters"
          }
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option._id || option.pid}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {option[arr[index - 1]] || 'Unknown'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {arr2[others[0] - 1]}: {option[arr[others[0] - 1]] || 'N/A'} <br /> 
                {arr2[others[1] - 1]}: {option[arr[others[1] - 1]] || 'N/A'} 
              </Typography>
            </Box>
          </Box>
        </li>
      )}
    />
  );
};