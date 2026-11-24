import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import { Box, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { PatientAutocomplete } from './patientAutoComp';
import CardActionButton from './CardActionButton';
import usePatientStore from '../store/usePatientStore';

/**
 * Step 1 of the pharmacy / lab flows: find the patient with the shared
 * three-box finder (mobile, name, ID - picking one fills the other two), then
 * press Next. Calls `onNext(patient)` with `{ pname, pid, mobile }`.
 *
 * The finder's typed text lives in a shared store, so it is cleared when this
 * step goes away - the next time it opens (e.g. via a Back button) it starts empty.
 *
 * @param {(patient: {pname: string, pid: string, mobile: string}) => void} onNext
 */
export default function PatientFinder({ onNext }) {
  const [patient, setPatient] = useState(null);
  const clearPatient = usePatientStore((state) => state.clearPatient);

  useEffect(() => () => clearPatient(), [clearPatient]);

  const handleNext = () => {
    if (!patient) {
      toast.error('Please find and select a patient first.');
      return;
    }
    onNext(patient);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ pt: 1, flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Search by mobile number, name or ID and pick the patient.
        </Typography>
        <Grid container spacing={3}>
          {/* mobile first, then name, then ID (the boxes' numbers are fixed: 1 name, 2 ID, 3 mobile) */}
          <Grid size={{ xs: 12 }}>
            <PatientAutocomplete index={3} setPatient={setPatient} patient={patient} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <PatientAutocomplete index={1} setPatient={setPatient} patient={patient} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <PatientAutocomplete index={2} setPatient={setPatient} patient={patient} />
          </Grid>
        </Grid>
      </Box>

      <CardActionButton onClick={handleNext} disabled={!patient}>
        Next
      </CardActionButton>
    </Box>
  );
}
