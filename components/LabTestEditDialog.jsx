import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import LabTestForm, { validateLabTest, toLabPayload } from './LabTestForm';

/**
 * Edit-lab-test modal: the same form as "add test", pre-filled. Only Cancel
 * and Save - no close (X) button, and clicking outside or pressing Escape does
 * nothing, so an edit is never lost by accident.
 *
 * Mount it only while editing (`{test && <LabTestEditDialog key={test._id} .../>}`) so the
 * form starts from that test's values each time.
 *
 * @param {{_id, name, price, pat_details, normal, timing: string[]}} test - the row being edited
 * @param {(payload: object) => Promise<boolean>} onSave - resolves true once saved
 * @param {() => void} onCancel
 */
export default function LabTestEditDialog({ test, onSave, onCancel }) {
  const [values, setValues] = useState({
    tname: test.name ?? '',
    price: String(test.price ?? ''),
    pat_details: test.pat_details ?? '',
    n_range: test.normal ?? '',
    timing: Array.isArray(test.timing) ? [...test.timing] : [],
  });
  const [errors, setErrors] = useState({});

  const handleSave = async () => {
    const found = validateLabTest(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await onSave({ id: test._id, ...toLabPayload(values) });
  };

  return (
    <Dialog open onClose={() => {}} disableEscapeKeyDown maxWidth="md" fullWidth>
      <DialogTitle>Edit lab test</DialogTitle>
      <DialogContent dividers>
        {/* pt: room for the outlined fields' floating labels */}
        <div style={{ paddingTop: 8 }}>
          <LabTestForm
            values={values}
            onChange={(next) => {
              setValues(next);
              setErrors({});
            }}
            errors={errors}
          />
        </div>
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
