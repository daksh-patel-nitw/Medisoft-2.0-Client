import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import RoomCategoryForm, { validateCategory, toCategoryPayload, categoryToValues } from './RoomCategoryForm';

/**
 * Edit-room-category modal: the same form as "add category", pre-filled. Only
 * Cancel and Save - no close (X), and clicking outside or pressing Escape does
 * nothing. Mount it only while editing so the form starts from that category.
 *
 * @param {object} category - the category being edited (as the server returned it)
 * @param {(payload: object) => Promise<boolean>} onSave - resolves true once saved
 * @param {() => void} onCancel
 */
export default function RoomCategoryEditDialog({ category, onSave, onCancel }) {
  const [values, setValues] = useState(() => categoryToValues(category));
  const [errors, setErrors] = useState({});

  const handleSave = async () => {
    const found = validateCategory(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await onSave({ id: category._id, ...toCategoryPayload(values) });
  };

  return (
    <Dialog open onClose={() => {}} disableEscapeKeyDown maxWidth="sm" fullWidth>
      <DialogTitle>Edit room category</DialogTitle>
      <DialogContent dividers>
        <div style={{ paddingTop: 8 }}>
          <RoomCategoryForm
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
