import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import RoomForm, { validateRoom, toRoomPayload } from './RoomForm';

/**
 * Edit-room modal: the same form as "add room", pre-filled (plus the room's
 * status). Only Cancel and Save - no close (X), and clicking outside or
 * pressing Escape does nothing. Mount it only while editing.
 *
 * @param {{id, room_no, floor, department, beds, status, category: {id}}} room - a row of GET /room
 * @param {{_id: string, name: string, pricePerDay: number}[]} categories
 * @param {(payload: object) => Promise<boolean>} onSave - resolves true once saved
 * @param {() => void} onCancel
 */
export default function RoomEditDialog({ room, categories, onSave, onCancel }) {
  const [values, setValues] = useState({
    room_no: room.room_no ?? '',
    floor: String(room.floor ?? ''),
    department: room.department ?? '',
    category: room.category?.id ?? '',
    beds: String(room.beds ?? ''),
    status: room.status ?? 'IU',
  });
  const [errors, setErrors] = useState({});

  const handleSave = async () => {
    const found = validateRoom(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await onSave({ id: room.id, ...toRoomPayload(values), status: values.status });
  };

  return (
    <Dialog open onClose={() => {}} disableEscapeKeyDown maxWidth="md" fullWidth>
      <DialogTitle>Edit room {room.room_no}</DialogTitle>
      <DialogContent dividers>
        <div style={{ paddingTop: 8 }}>
          <RoomForm
            values={values}
            onChange={(next) => {
              setValues(next);
              setErrors({});
            }}
            categories={categories}
            showStatus
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
