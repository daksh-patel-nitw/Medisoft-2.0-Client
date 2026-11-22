import Grid from '@mui/material/Grid2';
import { TextField, Chip, Typography, Box } from '@mui/material';
import { toast } from 'react-toastify';
import TimingsPicker from './TimingsAutoComp';

// Same rules the API enforces (Labs_DTO in the server's lab.dto.ts), checked
// here first so the user sees the problem next to the field.
//   tname / pat_details - letters, digits and spaces
//   n_range - also the symbols a range needs: . , - / % + ( ) : ^ (up to 60 characters)
//   price - a number above 0 (decimals allowed)
const TEXT_PATTERN = /^[\p{L}\p{M}\p{N}\s]+$/u;
const RANGE_PATTERN = /^[\p{L}\p{M}\p{N}\s.,\-–—/%+():^±]+$/u;
const RANGE_MAX_LENGTH = 60;
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export const EMPTY_LAB_TEST = { tname: '', price: '', pat_details: '', n_range: '', timing: [] };

/** Returns { field: message } for each invalid field; an empty object means the values can be sent. */
export function validateLabTest(values) {
  const errors = {};
  const check = (field, label) => {
    const v = values[field].trim();
    if (!v) errors[field] = `Enter the ${label}`;
    else if (!TEXT_PATTERN.test(v)) errors[field] = 'Letters, numbers and spaces only';
  };
  check('tname', 'test name');
  check('pat_details', 'required details');

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
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Required details (from the patient)"
          value={values.pat_details}
          onChange={set('pat_details')}
          error={Boolean(errors.pat_details)}
          helperText={errors.pat_details}
        />
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
