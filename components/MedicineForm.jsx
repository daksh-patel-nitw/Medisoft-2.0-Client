import Grid from '@mui/material/Grid2';
import { TextField, MenuItem } from '@mui/material';

// Same rules the API enforces (Add_Medicine_DTO in the server's pharmacy.dto.ts),
// checked here first so the user sees the problem next to the field.
//   name  - letters, spaces, apostrophes, hyphens
//   price - a number above 0 (decimals allowed)
//   ps / ps_u - whole numbers above 0
const NAME_PATTERN = /^[\p{L}\p{M}\s'-]+$/u;
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const WHOLE_PATTERN = /^\d+$/;

export const EMPTY_MEDICINE = { name: '', t: '', price: '', ps: '', ps_u: '' };

/** Returns { field: message } for each invalid field; an empty object means the values can be sent. */
export function validateMedicine(values) {
  const errors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Enter the medicine name';
  else if (!NAME_PATTERN.test(name)) errors.name = "Letters, spaces, ' and - only";

  if (!values.t) errors.t = 'Select a category';

  if (!String(values.price).trim()) errors.price = 'Enter the price';
  else if (!DECIMAL_PATTERN.test(String(values.price).trim()) || Number(values.price) <= 0) errors.price = 'Enter a number above 0';

  if (!String(values.ps).trim()) errors.ps = 'Enter the package size';
  else if (!WHOLE_PATTERN.test(String(values.ps).trim()) || Number(values.ps) <= 0) errors.ps = 'Whole number above 0';

  if (!String(values.ps_u).trim()) errors.ps_u = 'Enter the stock';
  else if (!WHOLE_PATTERN.test(String(values.ps_u).trim()) || Number(values.ps_u) <= 0) errors.ps_u = 'Whole number above 0';

  return errors;
}

/** The API takes every field as a string. */
export function toMedicinePayload(values) {
  return {
    name: values.name.trim(),
    t: values.t,
    price: String(values.price).trim(),
    ps: String(values.ps).trim(),
    ps_u: String(values.ps_u).trim(),
  };
}

/**
 * The medicine fields, shared by "add medicine" (empty) and the inventory's
 * edit dialog (filled), so both look and validate the same.
 *
 * @param {typeof EMPTY_MEDICINE} values
 * @param {(next: typeof EMPTY_MEDICINE) => void} onChange
 * @param {{_id: string, name: string}[]} categories
 * @param {object} [errors] - from validateMedicine; shown under each field
 */
export default function MedicineForm({ values, onChange, categories = [], errors = {} }) {
  const set = (field) => (event) => onChange({ ...values, [field]: event.target.value });

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Medicine name"
          value={values.name}
          onChange={set('name')}
          error={Boolean(errors.name)}
          helperText={errors.name}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          select
          fullWidth
          size="small"
          label="Category"
          value={values.t}
          onChange={set('t')}
          error={Boolean(errors.t)}
          helperText={errors.t}
        >
          {categories.map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth
          size="small"
          label="Price per unit (₹)"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          value={values.price}
          onChange={set('price')}
          error={Boolean(errors.price)}
          helperText={errors.price}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth
          size="small"
          label="Package size (units per pack)"
          type="number"
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
          value={values.ps}
          onChange={set('ps')}
          error={Boolean(errors.ps)}
          helperText={errors.ps}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth
          size="small"
          label="Packs in stock"
          type="number"
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
          value={values.ps_u}
          onChange={set('ps_u')}
          error={Boolean(errors.ps_u)}
          helperText={errors.ps_u}
        />
      </Grid>
    </Grid>
  );
}
