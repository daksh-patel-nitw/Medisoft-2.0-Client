import Grid from '@mui/material/Grid2';
import { useState } from 'react';
import { TextField, Chip, Typography, Box, Checkbox, FormControlLabel, Button, Divider } from '@mui/material';
import { toast } from 'react-toastify';
import TimingsPicker from './TimingsAutoComp';

// Same rules the API enforces (Labs_DTO in the server's lab.dto.ts), checked
// here first so the user sees the problem next to the field.
//   tname / pat_details / each default detail - letters, digits and spaces
//   pat_details is OPTIONAL (empty = nothing to type in when taking the sample); up to 10 default details
//   n_range - also the symbols a range needs: . , - / % + ( ) : ^ (up to 60 characters)
//   price - a number above 0 (decimals allowed)
const TEXT_PATTERN = /^[\p{L}\p{M}\p{N}\s]+$/u;
const RANGE_PATTERN = /^[\p{L}\p{M}\p{N}\s.,\-–—/%+():^±]+$/u;
const RANGE_MAX_LENGTH = 60;
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

// pat_details: the detail the lab types in when taking the sample (its label), with a flag saying whether it must be filled in.
// default_details: ready-made items [{ name, mandatory }] shown as checkboxes when taking the sample.
export const EMPTY_LAB_TEST = { tname: '', price: '', pat_details: '', pat_details_mandatory: true, default_details: [], n_range: '', timing: [] };

const MAX_DEFAULT_DETAILS = 10;

/** Returns { field: message } for each invalid field; an empty object means the values can be sent. */
export function validateLabTest(values) {
  const errors = {};
  const check = (field, label) => {
    const v = values[field].trim();
    if (!v) errors[field] = `Enter the ${label}`;
    else if (!TEXT_PATTERN.test(v)) errors[field] = 'Letters, numbers and spaces only';
  };
  check('tname', 'test name');
  const patDetails = values.pat_details.trim();
  if (patDetails && !TEXT_PATTERN.test(patDetails)) errors.pat_details = 'Letters, numbers and spaces only';

  const range = values.n_range.trim();
  if (!range) errors.n_range = 'Enter the normal range';
  else if (!RANGE_PATTERN.test(range)) errors.n_range = 'Letters, numbers, spaces and . , - / % + ( ) : ^ only';
  else if (range.length > RANGE_MAX_LENGTH) errors.n_range = `Up to ${RANGE_MAX_LENGTH} characters`;

  const price = String(values.price).trim();
  if (!price) errors.price = 'Enter the price';
  else if (!DECIMAL_PATTERN.test(price) || Number(price) <= 0) errors.price = 'Enter a number above 0';

  if (values.timing.length === 0) errors.timing = 'Add at least one timing slot';
  return errors;
}

export function toLabPayload(values) {
  return {
    tname: values.tname.trim(),
    price: String(values.price).trim(),
    pat_details: values.pat_details.trim(),
    // a detail that is not asked for cannot be mandatory
    pat_details_mandatory: values.pat_details.trim() !== '' && values.pat_details_mandatory,
    default_details: values.default_details,
    n_range: values.n_range.trim(),
    timing: values.timing,
  };
}

/**
 * The lab test fields, shared by "add test" (empty) and the manage-tests edit
 * dialog (filled), so both look and validate the same.
 *
 * @param {typeof EMPTY_LAB_TEST} values
 * @param {(next: typeof EMPTY_LAB_TEST) => void} onChange
 * @param {object} [errors] - from validateLabTest; shown under each field
 */
export default function LabTestForm({ values, onChange, errors = {} }) {
  const set = (field) => (event) => onChange({ ...values, [field]: event.target.value });

  const addTiming = (slot) => {
    if (values.timing.includes(slot)) {
      toast.info('Timing already added');
      return;
    }
    onChange({ ...values, timing: [...values.timing, slot] });
  };

  const removeTiming = (slot) => onChange({ ...values, timing: values.timing.filter((t) => t !== slot) });

  // default details: type a name, say whether it is mandatory, add it; tap a chip to flip mandatory / optional
  const [newDetail, setNewDetail] = useState('');
  const [newMandatory, setNewMandatory] = useState(true);
  const newDetailName = newDetail.trim();
  const newDetailError = newDetailName && !TEXT_PATTERN.test(newDetailName) ? 'Letters, numbers and spaces only' : '';

  const addDetail = () => {
    if (!newDetailName || newDetailError) return;
    if (values.default_details.some((d) => d.name.toLowerCase() === newDetailName.toLowerCase())) {
      toast.info('That detail is already added');
      return;
    }
    if (values.default_details.length >= MAX_DEFAULT_DETAILS) {
      toast.info(`Up to ${MAX_DEFAULT_DETAILS} default details`);
      return;
    }
    onChange({ ...values, default_details: [...values.default_details, { name: newDetailName, mandatory: newMandatory }] });
    setNewDetail('');
  };
  const removeDetail = (name) => onChange({ ...values, default_details: values.default_details.filter((d) => d.name !== name) });
  const toggleDetail = (name) =>
    onChange({ ...values, default_details: values.default_details.map((d) => (d.name === name ? { ...d, mandatory: !d.mandatory } : d)) });

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Test name"
          value={values.tname}
          onChange={set('tname')}
          error={Boolean(errors.tname)}
          helperText={errors.tname}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Test price (₹)"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          value={values.price}
          onChange={set('price')}
          error={Boolean(errors.price)}
          helperText={errors.price}
        />
      </Grid>
      {/* what the lab collects when taking the sample: one typed detail, and/or ready-made items to tick */}
      <Grid size={{ xs: 12 }}>
        <Typography variant="subtitle2" gutterBottom>
          Details to collect with the sample
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Detail to type in (optional)"
            placeholder="e.g. Fasting hours"
            value={values.pat_details}
            onChange={set('pat_details')}
            error={Boolean(errors.pat_details)}
            helperText={errors.pat_details || 'Becomes the label of a text box when the sample is taken'}
            sx={{ flex: '1 1 260px' }}
          />
          <FormControlLabel
            control={<Checkbox checked={values.pat_details_mandatory} disabled={!values.pat_details.trim()} onChange={(e) => onChange({ ...values, pat_details_mandatory: e.target.checked })} />}
            label="Required"
            sx={{ mt: 0.25 }}
          />
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Default detail (shown as a checkbox)"
            placeholder="e.g. 50g urine"
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addDetail();
              }
            }}
            error={Boolean(newDetailError)}
            helperText={newDetailError || ' '}
            sx={{ flex: '1 1 260px' }}
          />
          <FormControlLabel control={<Checkbox checked={newMandatory} onChange={(e) => setNewMandatory(e.target.checked)} />} label="Required" sx={{ mt: 0.25 }} />
          <Button variant="outlined" onClick={addDetail} disabled={!newDetailName || Boolean(newDetailError)} sx={{ height: 40 }}>
            Add
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
          {values.default_details.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No default details. Tap a chip to switch it between required and optional.
            </Typography>
          ) : (
            values.default_details.map((d) => (
              <Chip
                key={d.name}
                label={`${d.name} · ${d.mandatory ? 'required' : 'optional'}`}
                color={d.mandatory ? 'primary' : 'default'}
                variant={d.mandatory ? 'filled' : 'outlined'}
                onClick={() => toggleDetail(d.name)}
                onDelete={() => removeDetail(d.name)}
              />
            ))
          )}
        </Box>
        <Divider sx={{ mt: 1 }} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Normal range"
          placeholder="e.g. 70-110 mg/dL"
          value={values.n_range}
          onChange={set('n_range')}
          error={Boolean(errors.n_range)}
          helperText={errors.n_range}
        />
      </Grid>

      {/* Timings (availability): the picker on the left, the added slots on the right */}
      <Grid size={{ xs: 12, md: 5 }}>
        <TimingsPicker handleAdd={addTiming} />
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Box
          sx={{
            border: 1,
            borderColor: errors.timing ? 'error.main' : 'divider',
            borderRadius: 1,
            p: 2,
            mt: 1,
            minHeight: 56,
            height: 'calc(100% - 8px)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignContent: 'flex-start',
          }}
        >
          {values.timing.length > 0 ? (
            values.timing.map((slot) => (
              <Chip key={slot} label={slot} color="primary" variant="outlined" onDelete={() => removeTiming(slot)} />
            ))
          ) : (
            <Typography variant="body2" color={errors.timing ? 'error' : 'text.secondary'} sx={{ width: '100%', textAlign: 'center', mt: 1 }}>
              {errors.timing || 'No Timings Added'}
            </Typography>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}
