import Grid from '@mui/material/Grid2';
import { TextField, FormControlLabel, Switch, Typography, Box } from '@mui/material';

// The amenities a room category can have. Each is stored as 'Y' / 'N' on the
// server; note the API spells the refrigerator field "refrigator".
export const AMENITIES = [
  { key: 'sofa', label: 'Sofa' },
  { key: 'tv', label: 'TV' },
  { key: 'refrigator', label: 'Refrigerator' },
  { key: 'bathroom', label: 'Attached bathroom' },
  { key: 'ac', label: 'Air conditioning' },
];

// Same rules the API enforces (Add_Room_Category_DTO in the server's room.dto.ts).
//   name  - letters, digits, spaces; 2-50 characters
//   price - a number above 0
//   other - letters, digits, spaces; up to 200 characters (optional)
const TEXT = /^[\p{L}\p{M}\p{N}\s]+$/u;
const DECIMAL = /^\d+(\.\d+)?$/;

export const EMPTY_CATEGORY = {
  name: '',
  pricePerDay: '',
  ...Object.fromEntries(AMENITIES.map((a) => [a.key, 'N'])),
  other: '',
};

/** Returns { field: message } for each invalid field; an empty object means the values can be sent. */
export function validateCategory(values) {
  const errors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Enter the category name';
  else if (!TEXT.test(name)) errors.name = 'Letters, numbers and spaces only';
  else if (name.length < 2 || name.length > 50) errors.name = '2 to 50 characters';

  const price = String(values.pricePerDay).trim();
  if (!price) errors.pricePerDay = 'Enter the price per day';
  else if (!DECIMAL.test(price) || Number(price) <= 0) errors.pricePerDay = 'Enter a number above 0';

  const other = values.other.trim();
  if (other && !TEXT.test(other)) errors.other = 'Letters, numbers and spaces only';
  else if (other.length > 200) errors.other = 'Up to 200 characters';
  return errors;
}

/** The API takes every field as a string; `other` is sent only when there is text. */
export function toCategoryPayload(values) {
  return {
    name: values.name.trim(),
    pricePerDay: String(values.pricePerDay).trim(),
    ...Object.fromEntries(AMENITIES.map((a) => [a.key, values[a.key]])),
    ...(values.other.trim() && { other: values.other.trim() }),
  };
}

/** The server's category -> form values (for editing). */
export function categoryToValues(category) {
  return {
    name: category.name ?? '',
    pricePerDay: String(category.pricePerDay ?? ''),
    ...Object.fromEntries(AMENITIES.map((a) => [a.key, category[a.key] === 'Y' ? 'Y' : 'N'])),
    other: category.other ?? '',
  };
}

/**
 * The room category fields, shared by "add category" (empty) and the manage
 * tab's edit dialog (filled), so both look and validate the same.
 */
export default function RoomCategoryForm({ values, onChange, errors = {} }) {
  const set = (field) => (event) => onChange({ ...values, [field]: event.target.value });

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 8 }}>
        <TextField
          fullWidth
          size="small"
          label="Category name"
          value={values.name}
          onChange={set('name')}
          error={Boolean(errors.name)}
          helperText={errors.name}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth
          size="small"
          label="Price per day (₹)"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          value={values.pricePerDay}
          onChange={set('pricePerDay')}
          error={Boolean(errors.pricePerDay)}
          helperText={errors.pricePerDay}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Amenities
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3 }}>
          {AMENITIES.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              control={<Switch checked={values[key] === 'Y'} onChange={(e) => onChange({ ...values, [key]: e.target.checked ? 'Y' : 'N' })} />}
              label={label}
            />
          ))}
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Other amenities (optional)"
          value={values.other}
          onChange={set('other')}
          error={Boolean(errors.other)}
          helperText={errors.other}
        />
      </Grid>
    </Grid>
  );
}
