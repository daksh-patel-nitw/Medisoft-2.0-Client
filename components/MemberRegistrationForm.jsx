import React, { useState } from 'react';
import Grid from '@mui/material/Grid2';
import { Card, CardContent, Box, TextField, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, FormHelperText } from '@mui/material';
import { apis } from '../services/commonServices';
import CardActionButton from './CardActionButton';

// The rules below mirror the API's validators (createAddNewMemberDTO in the
// server's member.dto.ts) so the user sees a problem next to the field.
const NAME = /^[\p{L}\p{M}\s'-]+$/u; // v_name: letters, spaces, apostrophes, hyphens
const CITY = /^[\p{L}\p{M}_]+$/u; // v_string_letters: letters only
const ADDRESS = /^[\p{L}\p{M}\p{N}\-,.\s]+$/u; // v_string_address
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAME_MESSAGE = "Letters, spaces, ' and - only";

// field key, label, whether it is required, and how to check a value
const COMMON_FIELDS = [
  { key: 'fname', label: 'First name', required: true, test: NAME, message: NAME_MESSAGE },
  { key: 'middlename', label: 'Middle name', required: true, test: NAME, message: NAME_MESSAGE },
  { key: 'lname', label: 'Last name', required: true, test: NAME, message: NAME_MESSAGE },
  { key: 'gender', label: 'Gender', required: true, kind: 'gender' },
  { key: 'dob', label: 'Date of birth', required: true, kind: 'date' },
  { key: 'mobile', label: 'Mobile', required: true, test: /^\d{10}$/, message: '10 digits', inputMode: 'numeric' },
  { key: 'email', label: 'Email', required: true, test: EMAIL, message: 'Enter a valid email' },
  { key: 'address', label: 'Address', required: true, test: ADDRESS, message: 'Letters, numbers, spaces and , . - only' },
  { key: 'city', label: 'City', required: true, test: CITY, message: 'Letters only (no spaces)' },
  { key: 'pincode', label: 'Pincode', required: true, test: /^\d{6}$/, message: '6 digits', inputMode: 'numeric' },
];

const PATIENT_FIELDS = [
  { key: 'allergy', label: 'Allergies (optional)', test: NAME, message: NAME_MESSAGE },
  { key: 'conditions', label: 'Existing conditions (optional)', test: NAME, message: NAME_MESSAGE },
  { key: 'others', label: 'Other notes (optional)', test: NAME, message: NAME_MESSAGE },
];

// Employees need nothing extra at registration: their degree, college and working details are filled in by the
// doctor after first login, and their time zone is chosen while setting their own password.
const EMPLOYEE_FIELDS = [];

const today = () => new Date().toISOString().split('T')[0];

function initialValues(fields) {
  return Object.fromEntries(fields.map((f) => [f.key, '']));
}

function validate(fields, values) {
  const errors = {};
  for (const f of fields) {
    const v = String(values[f.key] ?? '').trim();
    if (!v) {
      if (f.required) errors[f.key] = 'Required';
    } else if (f.kind === 'date') {
      if (v > today()) errors[f.key] = 'Cannot be in the future';
    } else if (f.test && !f.test.test(v)) {
      errors[f.key] = f.message;
    }
  }
  return errors;
}

/**
 * Registration card for one kind of member, in the app's usual layout
 * (centered card, fields, rule + tall button at the bottom). The two
 * registration pages are this component with a different `kind`:
 *   patient  -> POST /reception/addPatient   (adds allergies / conditions / notes)
 *   employee -> POST /reception/addEmployee
 *
 * @param {'patient'|'employee'} kind
 */
export default function MemberRegistrationForm({ kind }) {
  const isPatient = kind === 'patient';
  const fields = useMemo(() => [...COMMON_FIELDS, ...(isPatient ? PATIENT_FIELDS : EMPLOYEE_FIELDS)], [isPatient]);

  const [values, setValues] = useState(() => initialValues(fields));
  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(fields, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // only send the optional fields that have text
    const payload = {};
    for (const f of fields) {
      const v = String(values[f.key] ?? '').trim();
      if (v) payload[f.key] = v;
    }

    try {
      // The server replies with its own message (including the new id) as a toast.
      await apis.postRequest(isPatient ? '/reception/addPatient' : '/reception/addEmployee', payload);
      setValues(initialValues(fields));
    } catch (error) {
      // Already toasted by the http client; keep the form so nothing is lost.
    }
  };

  const renderField = (f) => {
    if (f.kind === 'gender') {
      return (
        <FormControl error={Boolean(errors.gender)}>
          <FormLabel sx={{ fontSize: 12 }}>{f.label}</FormLabel>
          <RadioGroup row value={values.gender} onChange={(e) => set('gender', e.target.value)}>
            <FormControlLabel value="M" control={<Radio size="small" />} label="Male" />
            <FormControlLabel value="F" control={<Radio size="small" />} label="Female" />
            <FormControlLabel value="O" control={<Radio size="small" />} label="Other" />
          </RadioGroup>
          {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
        </FormControl>
      );
    }
    return (
      <TextField
        fullWidth
        size="small"
        label={f.label}
        type={f.kind === 'date' ? 'date' : 'text'}
        value={values[f.key]}
        onChange={(e) => set(f.key, e.target.value)}
        error={Boolean(errors[f.key])}
        helperText={errors[f.key] || ' '}
        slotProps={{
          ...(f.kind === 'date' && { inputLabel: { shrink: true }, htmlInput: { max: today() } }),
          ...(f.inputMode && { htmlInput: { inputMode: f.inputMode } }),
        }}
      />
    );
  };

  return (
    // One card, centered, filling the height the layout gives it; the button sits at the bottom.
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <form onSubmit={submit} autoComplete="off" noValidate style={{ width: '100%', maxWidth: 1000, height: '100%', display: 'flex' }}>
        <Card sx={{ width: '100%', boxShadow: 3, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          <CardContent sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* pt: room for the outlined fields' floating labels */}
            <Grid container spacing={2} sx={{ pt: 1 }}>
              {fields.map((f) => (
                <Grid key={f.key} size={{ xs: 12, sm: 6, md: 4 }}>
                  {renderField(f)}
                </Grid>
              ))}
            </Grid>
          </CardContent>

          <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column' }}>
            <CardActionButton type="submit">{isPatient ? 'Register patient' : 'Register employee'}</CardActionButton>
          </Box>
        </Card>
      </form>
    </Box>
  );
}
