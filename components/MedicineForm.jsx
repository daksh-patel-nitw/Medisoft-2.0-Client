import Grid from '@mui/material/Grid2';
import { TextField, MenuItem } from '@mui/material';

// Same rules the API enforces (Add_Medicine_DTO in the server's pharmacy.dto.ts),
// checked here first so the user sees the problem next to the field.
//   name  - letters, numbers and spaces
//   price - the price of ONE unit: a number above 0 (decimals allowed)
//   ps / ps_u - whole numbers above 0
// `packPrice` (the price of a whole pack) only helps work out the price per unit; it is never sent.
const NAME_PATTERN = /^[\p{L}\p{M}\p{N}\s]+$/u;
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const WHOLE_PATTERN = /^\d+$/;

export const EMPTY_MEDICINE = { name: '', t: '', packPrice: '', price: '', ps: '', ps_u: '' };

/** True when the chosen category can be sold in loose pieces (freeQuantity 'Y'). */
export const sellsLoose = (categories, categoryId) => categories.find((c) => c._id === categoryId)?.freeQuantity === 'Y';

/** Price of one unit from the price of a whole pack, e.g. 100 for 10 units -> '10'. '' when either number is not usable yet. */
const perUnit = (packPrice, packSize) => {
  const pack = Number(packPrice);
  const size = Number(packSize);
  if (!DECIMAL_PATTERN.test(String(packPrice).trim()) || !WHOLE_PATTERN.test(String(packSize).trim()) || pack <= 0 || size <= 0) return '';
  return String(Number((pack / size).toFixed(4)));
};

/** The price of a whole pack from the price of one unit (for editing a saved medicine). */
export const packPriceOf = (price, packSize) => String(Number((Number(price) * Number(packSize)).toFixed(2)));

/** Returns { field: message } for each invalid field; an empty object means the values can be sent. */
export function validateMedicine(values, loose = false) {
  const errors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Enter the medicine name';
  else if (!NAME_PATTERN.test(name)) errors.name = 'Letters, numbers and spaces only';

  if (!values.t) errors.t = 'Select a category';

  if (!String(values.price).trim()) errors.price = 'Enter the price per unit';
  else if (!DECIMAL_PATTERN.test(String(values.price).trim()) || Number(values.price) <= 0) errors.price = 'Enter a number above 0';

  if (!String(values.ps).trim()) errors.ps = 'Enter the package size';
  else if (!WHOLE_PATTERN.test(String(values.ps).trim()) || Number(values.ps) <= 0) errors.ps = 'Whole number above 0';

  // only for loose categories, and only a helper: when typed it must at least be a number
  if (loose && String(values.packPrice).trim() && (!DECIMAL_PATTERN.test(String(values.packPrice).trim()) || Number(values.packPrice) <= 0)) {
    errors.packPrice = 'Enter a number above 0';
  }

  if (!String(values.ps_u).trim()) errors.ps_u = 'Enter the stock';
  else if (!WHOLE_PATTERN.test(String(values.ps_u).trim()) || Number(values.ps_u) <= 0) errors.ps_u = 'Whole number above 0';

  return errors;
}

/** The API takes every field as a string. The package price is not part of it. */
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
 * - A category sold in loose pieces shows the package size and the package price side by side; the price per
 *   unit below is worked out from them (and can still be changed by hand). The package price is only a helper
 *   for this screen - the API gets the price per unit.
 * - A pack-only category hides the package price: the package size starts at 1 (editable) and the price is
 *   simply what one unit costs.
 *
 * @param {typeof EMPTY_MEDICINE} values
 * @param {(next: typeof EMPTY_MEDICINE) => void} onChange
 * @param {{_id: string, name: string, freeQuantity: 'Y' | 'N'}[]} categories
 * @param {object} [errors] - from validateMedicine; shown under each field
 */
export default function MedicineForm({ values, onChange, categories = [], errors = {} }) {
  const loose = sellsLoose(categories, values.t);

  // one place for every change, so the derived fields stay in step
  const change = (patch) => {
    const next = { ...values, ...patch };
    const nextLoose = sellsLoose(categories, next.t);
    if ('t' in patch && !nextLoose) {
      next.ps = '1'; // pack-only: the package size starts at 1
      next.packPrice = '';
    }
    // the price per unit follows the package price and size (loose categories), until the user types it themselves
    if (nextLoose && ('packPrice' in patch || 'ps' in patch || 't' in patch)) {
      const computed = perUnit(next.packPrice, next.ps);
      if (computed) next.price = computed;
    }
    onChange(next);
  };
  const set = (field) => (event) => change({ [field]: event.target.value });

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

      <Grid size={{ xs: 12, sm: loose ? 6 : 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Package size (units per pack)"
          type="number"
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
          value={values.ps}
          onChange={set('ps')}
          error={Boolean(errors.ps)}
          helperText={errors.ps || (loose ? undefined : 'Sold in full packs only')}
        />
      </Grid>

      {loose && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="Package size price (₹)"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            value={values.packPrice}
            onChange={set('packPrice')}
            error={Boolean(errors.packPrice)}
            helperText={errors.packPrice || 'Price of the whole pack'}
          />
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          size="small"
          label="Price per unit (₹)"
          type="number"
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          value={values.price}
          onChange={set('price')}
          error={Boolean(errors.price)}
          helperText={errors.price || (loose ? 'Worked out from the package price and size - you can change it' : undefined)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
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
