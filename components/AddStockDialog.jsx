import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';

const WHOLE_PATTERN = /^\d+$/;

/** A blank box is "none"; anything else must be a whole number above 0 (the API rejects 0). */
const fieldError = (value) => {
  const v = value.trim();
  if (v === '') return null;
  return WHOLE_PATTERN.test(v) && Number(v) > 0 ? null : 'Whole number above 0';
};

/**
 * "Add stock" modal for a medicine: how many packs to add, and - only for
 * categories sold in loose pieces - how many loose pieces. The amounts are
 * ADDED to the current stock by the API (PUT /pharmacy/increment); this does
 * not set the stock to a new total. Only Cancel and Save, no close (X), and
 * clicking outside or pressing Escape does nothing.
 *
 * Mount it only while adding stock so the boxes start empty each time.
 *
 * @param {{_id, name, ps_u, ps_c, t: {freeQuantity}}} medicine
 * @param {(payload: {id: string, ps_u?: string, ps_c?: string}) => Promise<boolean>} onSave - resolves true once saved
 * @param {() => void} onCancel
 */
export default function AddStockDialog({ medicine, onSave, onCancel }) {
  const [packs, setPacks] = useState('');
  const [loose, setLoose] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const allowsLoose = medicine.t?.freeQuantity === 'Y';
  const packsError = fieldError(packs);
  const looseError = allowsLoose ? fieldError(loose) : null;
  const nothingEntered = packs.trim() === '' && (!allowsLoose || loose.trim() === '');
  const hasError = Boolean(packsError || looseError);

  const handleSave = async () => {
    setSubmitted(true);
    if (hasError || nothingEntered) return;
    const payload = { id: medicine._id };
    if (packs.trim()) payload.ps_u = packs.trim();
    if (allowsLoose && loose.trim()) payload.ps_c = loose.trim();
    await onSave(payload);
  };

  return (
    <Dialog open onClose={() => {}} disableEscapeKeyDown maxWidth="xs" fullWidth>
      <DialogTitle>Add stock</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" fontWeight="bold">
          {medicine.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Currently {medicine.ps_u} pack(s){allowsLoose ? ` and ${medicine.ps_c ?? 0} loose piece(s)` : ''}. What you enter is added to this.
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: allowsLoose ? 6 : 12 }}>
            <TextField
              fullWidth
              size="small"
              autoFocus
              label="Packs to add"
              type="number"
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              value={packs}
              onChange={(e) => setPacks(e.target.value)}
              error={Boolean(packsError) || (submitted && nothingEntered)}
              helperText={packsError || (submitted && nothingEntered ? 'Enter an amount to add' : ' ')}
            />
          </Grid>
          {allowsLoose && (
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Loose pieces to add"
                type="number"
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                value={loose}
                onChange={(e) => setLoose(e.target.value)}
                error={Boolean(looseError)}
                helperText={looseError || ' '}
              />
            </Grid>
          )}
        </Grid>
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
