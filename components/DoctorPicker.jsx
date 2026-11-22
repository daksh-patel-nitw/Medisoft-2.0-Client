import React from 'react';
import { Autocomplete, TextField, Box, Typography, Skeleton } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

/**
 * The shared "find a doctor" box: search the list by name and see each
 * doctor's department and price. Used by the outpatient booking flow
 * (AppointmentBooking) and by the room desk's admission page - they pass
 * different lists (outpatient vs inpatient doctors).
 *
 * @param {{did: string, dname: string, dep: string, price?: number}[] | null} doctors - null while loading
 * @param {object | null} value - the chosen doctor
 * @param {(doctor: object | null) => void} onChange
 * @param {string} [label]
 * @param {string} [priceSuffix] - appended to each price, e.g. "/day" for inpatient doctors
 */
export default function DoctorPicker({ doctors, value, onChange, label = 'Select doctor', priceSuffix = '' }) {
  if (doctors === null) {
    return <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />;
  }

  return (
    <Autocomplete
      options={doctors}
      value={value}
      onChange={(_event, next) => onChange(next)}
      size="small"
      noOptionsText="No doctors found"
      getOptionLabel={(d) => d.dname || ''}
      isOptionEqualToValue={(a, b) => a.did === b.did}
      renderInput={(params) => <TextField {...params} label={label} />}
      renderOption={(props, d) => {
        const { key, ...rest } = props;
        return (
          <li {...rest} key={d.did}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  {d.dname}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {d.dep}
                  {d.price != null ? ` · ₹${d.price}${priceSuffix}` : ''}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
    />
  );
}
