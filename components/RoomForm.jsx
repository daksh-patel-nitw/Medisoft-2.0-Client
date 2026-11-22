import Grid from '@mui/material/Grid2';
import { TextField, MenuItem, Box, Typography } from '@mui/material';
import RoomCategoryDetails from './RoomCategoryDetails';

// Same rules the API enforces (Add_Room_DTO in the server's room.dto.ts).
//   room_no    - letters, digits, underscore; up to 10 characters
//   floor      - whole number, 0 allowed (ground floor)
//   department - letters only
//   beds       - whole number above 0
const ROOM_NO = /^[A-Za-z0-9_]+$/;
const WHOLE = /^\d+$/;
const LETTERS = /^[\p{L}\p{M}_]+$/u;

// RoomStatus on the server
export const ROOM_STATUSES = [
  { value: 'IU', label: 'In service' },
  { value: 'f', label: 'Full' },
  { value: 'NU', label: 'Not in use' },
];

export const EMPTY_ROOM = { room_no: '', floor: '', department: '', category: '', beds: '' };

/** Returns { field: message } for each invalid field; an empty object means the values can be sent. */
export function validateRoom(values) {
  const errors = {};
  const roomNo = values.room_no.trim();
  if (!roomNo) errors.room_no = 'Enter the room number';
  else if (!ROOM_NO.test(roomNo) || roomNo.length > 10) errors.room_no = 'Letters and numbers, up to 10 characters';

  const floor = String(values.floor).trim();
  if (!floor) errors.floor = 'Enter the floor (0 for ground)';
  else if (!WHOLE.test(floor)) errors.floor = 'Whole number';

  const department = values.department.trim();
  if (!department) errors.department = 'Enter the department';
  else if (!LETTERS.test(department)) errors.department = 'Letters only (no spaces)';

  if (!values.category) errors.category = 'Select a category';

  const beds = String(values.beds).trim();
  if (!beds) errors.beds = 'Enter the number of beds';
  else if (!WHOLE.test(beds) || Number(beds) <= 0) errors.beds = 'Whole number above 0';
  return errors;
}

/** The API takes every field as a string. Departments are stored lowercase, like the seeded ones, so they match exactly when searched. */
export function toRoomPayload(values) {
  return {
    room_no: values.room_no.trim(),
    floor: String(values.floor).trim(),
    department: values.department.trim().toLowerCase(),
    category: values.category,
    beds: String(values.beds).trim(),
  };
}

/**
 * The room fields, shared by "add room" (empty) and the rooms table's edit
 * dialog (filled). Choosing a category shows its details - price and every
 * amenity - in a panel beside the fields.
 *
 * @param {typeof EMPTY_ROOM & {status?: string}} values
 * @param {(next) => void} onChange
 * @param {{_id: string, name: string, pricePerDay: number}[]} categories
 * @param {boolean} [showStatus] - also show the room's status (used when editing)
 * @param {object} [errors] - from validateRoom
 */
export default function RoomForm({ values, onChange, categories = [], showStatus = false, errors = {} }) {
  const set = (field) => (event) => onChange({ ...values, [field]: event.target.value });
  const chosen = categories.find((c) => c._id === values.category);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label="Room number" value={values.room_no} onChange={set('room_no')} error={Boolean(errors.room_no)} helperText={errors.room_no} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Floor"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              value={values.floor}
              onChange={set('floor')}
              error={Boolean(errors.floor)}
              helperText={errors.floor}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Department" value={values.department} onChange={set('department')} error={Boolean(errors.department)} helperText={errors.department} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField select fullWidth size="small" label="Room category" value={values.category} onChange={set('category')} error={Boolean(errors.category)} helperText={errors.category}>
              {categories.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name} — ₹{Number(c.pricePerDay).toFixed(0)}/day
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: showStatus ? 6 : 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Beds"
              type="number"
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              value={values.beds}
              onChange={set('beds')}
              error={Boolean(errors.beds)}
              helperText={errors.beds}
            />
          </Grid>
          {showStatus && (
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth size="small" label="Status" value={values.status ?? 'IU'} onChange={set('status')}>
                {ROOM_STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* what the chosen category gives you, beside the fields */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, height: '100%', minHeight: 160, bgcolor: '#fafafa' }}>
          {chosen ? (
            <RoomCategoryDetails category={chosen} showTitle />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Select a room category to see its price and amenities here.
            </Typography>
          )}
        </Box>
      </Grid>
    </Grid>
  );
}
