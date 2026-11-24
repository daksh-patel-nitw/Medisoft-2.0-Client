import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import MedicineForm, { validateMedicine, toMedicinePayload, sellsLoose, packPriceOf } from './MedicineForm';

/**
 * Edit-medicine modal: the same form as "add medicine", pre-filled. Only
 * Cancel and Save - no close (X) button, and clicking outside or pressing
 * Escape does nothing, so an edit is never lost by accident.
 *
 * Mount it only while editing (`{medicine && <MedicineEditDialog key={medicine._id} .../>}`) so
 * the form starts from that medicine's values each time.
 *
 * @param {{_id, name, price, ps, ps_u, t: {_id, name}}} medicine - the row being edited
 * @param {{_id: string, name: string}[]} categories
 * @param {(payload: object) => Promise<boolean>} onSave - resolves true once saved (the dialog then closes)
 * @param {() => void} onCancel
 */
export default function MedicineEditDialog({ medicine, categories, onSave, onCancel }) {
  const [values, setValues] = useState(() => {
    const t = medicine.t?._id ?? '';
    return {
      name: medicine.name,
      t,
      // the price of a whole pack, shown only for categories sold in loose pieces (never saved)
      packPrice: sellsLoose(categories, t) ? packPriceOf(medicine.price, medicine.ps) : '',
      price: String(medicine.price),
      ps: String(medicine.ps),
      ps_u: String(medicine.ps_u),
    };
  });
  const [errors, setErrors] = useState({});

  const handleSave = async () => {
    const found = validateMedicine(values, sellsLoose(categories, values.t));
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await onSave({ id: medicine._id, ...toMedicinePayload(values) });
  };

  return (
    <Dialog open onClose={() => {}} disableEscapeKeyDown maxWidth="sm" fullWidth>
      <DialogTitle>Edit medicine</DialogTitle>
      <DialogContent dividers>
        <MedicineForm
          values={values}
          onChange={(next) => {
            setValues(next);
            setErrors({});
          }}
          categories={categories}
          errors={errors}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
