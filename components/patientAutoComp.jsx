import React, { useState, useMemo, useRef } from 'react';
import { Autocomplete, TextField, Box, Typography } from '@mui/material';
import { debounce } from '@mui/material/utils';
import PersonIcon from "@mui/icons-material/Person";
import { apis } from '../services/commonServices';
import usePatientStore from '../store/usePatientStore';

// The three boxes: index 1 = name, 2 = id, 3 = mobile.
const FIELDS = ["pname", "pid", "mobile"];
const LABELS = ["Name", "ID", "Mobile"];
// The API's searchType for each box.
const SEARCH_TYPES = ["name", "id", "mob"];
// The API needs at least this many characters (mobile: 5 digits).
const MIN_LENGTH = [3, 3, 5];
// Characters each box accepts.
const ALLOWED = [/^[a-zA-Z ]*$/, /^[A-Z0-9]*$/, /^[0-9]*$/];
const ERROR_MESSAGES = [
  "Characters allowed are A-Z, a-z and spaces",
  "Characters allowed are A-Z, 0-9",
  "Only numbers are allowed",
];

/**
 * One of the three patient-finder boxes (name / ID / mobile). Use all three
 * together (see PatientFinder). They share a store (store/usePatientStore.js):
 *  - picking a patient in ANY box fills all three boxes with that patient's
 *    name, ID and mobile;
 *  - clearing (the X, or emptying the box) clears all three boxes and the
 *    list of fetched patients.
 *
 * @param {1|2|3} index - which box this is
 * @param {(patient: {pname, pid, mobile} | null) => void} setPatient - told whenever the picked patient changes
 * @param {{pname, pid, mobile} | null} patient - the currently picked patient (owned by the parent)
 */
export const PatientAutocomplete = ({ index, setPatient, patient }) => {
  const [error, setError] = useState(false);
  const requestId = useRef(0); // lets a slow, older search be ignored

  const inputValue = usePatientStore((state) => state.inputValues[FIELDS[index - 1]]);
  const options = usePatientStore((state) => state.options);
  const setPatientAutoComp = usePatientStore((state) => state.setPatientAutoComp);
  const setPatientOptions = usePatientStore((state) => state.setPatientOptions);
  const selectPatient = usePatientStore((state) => state.selectPatient);
  const clearPatient = usePatientStore((state) => state.clearPatient);

  // Debounced search: POST /reception/filteredpatients with one filter ->
  // [{ pname, pid, mobile }]. (Reception 1, the pharmacy and the lab can use it.)
  const fetchPatients = useMemo(
    () =>
      debounce(async (query, isStillWanted) => {
        try {
          const response = await apis.postReadRequest('/reception/filteredpatients', [
            { searchtext: query, searchType: SEARCH_TYPES[index - 1] },
          ]);
          if (isStillWanted()) setPatientOptions(response || []);
        } catch (err) {
          console.error('Error fetching patients:', err);
        }
      }, 500),
    [index, setPatientOptions]
  );

  const handleInputChange = (event, text, reason) => {
    // Picking an option or clearing is handled in onChange; only react to typing here.
    if (reason !== 'input') return;

    const valid = ALLOWED[index - 1].test(text);
    setError(!valid);
    if (!valid) return;

    setPatientAutoComp(FIELDS[index - 1], text);

    const id = ++requestId.current;
    if (text.length >= MIN_LENGTH[index - 1]) {
      fetchPatients(text, () => id === requestId.current);
    } else {
      // too short to search: drop any older list rather than leave stale results showing
      setPatientOptions([]);
    }
  };

  const handleChange = (event, newValue) => {
    requestId.current += 1; // forget any search still in flight
    if (newValue) {
      selectPatient(newValue); // all three boxes now show this patient
    } else {
      clearPatient(); // all three boxes and the fetched list are emptied
    }
    setError(false);
    if (setPatient) setPatient(newValue || null);
  };

  // Show the other two details under each option
  const others = [1, 2, 3].filter((i) => i !== index);

  return (
    <Autocomplete
      value={patient ?? null}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      options={options}
      getOptionLabel={(option) => option[FIELDS[index - 1]]?.toString() || ''}
      isOptionEqualToValue={(option, value) => option.pid === value.pid}
      // The server already filtered the list; don't filter it again on the typed text.
      filterOptions={(x) => x}
      noOptionsText="No patients found"
      renderInput={(params) => (
        <TextField
          {...params}
          error={error}
          label={error ? ERROR_MESSAGES[index - 1] : `Search Patient ${LABELS[index - 1]}`}
          fullWidth
          size="small"
          helperText={
            error
              ? "Don't use special Characters"
              : index === 3 ? "Enter at least 5 digits" : "Enter at least 3 characters"
          }
        />
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <li {...rest} key={option.pid}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {option[FIELDS[index - 1]] || 'Unknown'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {LABELS[others[0] - 1]}: {option[FIELDS[others[0] - 1]] || 'N/A'} <br />
                  {LABELS[others[1] - 1]}: {option[FIELDS[others[1] - 1]] || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
};
