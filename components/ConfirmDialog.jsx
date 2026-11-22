import { Dialog, DialogContent, DialogActions, Button, Typography } from '@mui/material';

/**
 * Shared confirmation modal: a message and OK / Cancel, nothing else.
 * Deliberately no close (X) button, and neither clicking the backdrop nor
 * pressing Escape dismisses it - the user has to answer with a button.
 *
 * @param {boolean} open
 * @param {string} message - what the user is being asked to confirm
 * @param {() => void} onConfirm - OK pressed
 * @param {() => void} onCancel - Cancel pressed
 */
export default function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  return (
    <Dialog
      open={open}
      // MUI calls onClose for backdrop clicks and Escape; ignoring it (and
      // not passing onCancel here) is what makes them do nothing.
      onClose={() => {}}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
    >
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm} autoFocus>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
