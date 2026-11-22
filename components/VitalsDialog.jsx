import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Checkbox, FormControlLabel, Box } from '@mui/material';
import Grid from '@mui/material/Grid2';

const DECIMAL = /^\d+(\.\d+)?$/;

// A blank box is an error; otherwise it must be a number above 0 (the API rejects 0).
const check = (value) => {
  const v = String(value).trim();
  if (!v) return 'Required';
  return DECIMAL.test(v) && Number(v) > 0 ? null : 'Enter a number above 0';
};

/**
 * Take a patient's vitals when they arrive: weight, height and the doctor's
 * pre-consultation checklist. Saving confirms the arrival (the appointment
 * moves on to the doctor's queue). Only Cancel and Save - no close (X), and
 * clicking outside or pressing Escape does nothing.
 *
 * Mount it only while open so it starts blank for each patient.
 *
 * @param {{_id, pname, questions?: string[]}} appointment
 * @param {(payload: {aid: string, weight: string, height: string, selected_doctor_qs: string[]}) => Promise<boolean>} onSave
 * @param {() => void} onCancel
 */
export default function VitalsDialog({ appointment, onSave, onCancel }) {
  const questions = appointment.questions ?? [];
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [ticked, setTicked] = useState(() => new Set());
  const [submitted, setSubmitted] = useState(false);

  const weightError = submitted ? check(weight) : null;
  const heightError = submitted ? check(height) : null;

  const toggle = (q) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });

  const handleSave = async () => {
    setSubmitted(true);
    if (check(weight) || check(height)) return;
    await onSave({
      aid: appointment._id,
      weight: weight.trim(),
      height: height.trim(),
      // the questions the patient answered yes to (an empty list is fine)
      selected_doctor_qs: questions.filter((q) => ticked.has(q)),
    });
  };

  return (
    <Dialog open onClose={() => {}} disableEscapeKeyDown maxWidth="sm" fullWidth>
      <DialogTitle>
        Vitals for <strong>{appointment.pname}</strong>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              size="small"
              autoFocus
              label="Weight (kg)"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              error={Boolean(weightError)}
              helperText={weightError || ' '}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Height (cm)"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              error={Boolean(heightError)}
              helperText={heightError || ' '}
            />
          </Grid>
        </Grid>

        {questions.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Pre-consultation checklist (tick what applies)
            </Typography>
            {questions.map((q) => (
              <FormControlLabel
                key={q}
                sx={{ display: 'block' }}
                control={<Checkbox size="small" checked={ticked.has(q)} onChange={() => toggle(q)} />}
                label={q}
              />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Confirm arrival
        </Button>
      </DialogActions>
    </Dialog>
  );
}
