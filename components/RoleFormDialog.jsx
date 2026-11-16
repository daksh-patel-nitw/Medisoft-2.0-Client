import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Divider } from '@mui/material';
import PermissionPicker from './PermissionPicker';

// Shared create/edit dialog for a role. In edit mode the role name is fixed
// (the backend matches on it to update permissions), only the permission set
// can change.
export default function RoleFormDialog({ open, mode, initialRole, initialFlags, onClose, onSubmit }) {
  const [roleName, setRoleName] = useState('');
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    if (!open) return;
    setRoleName(initialRole || '');
    setFlags(initialFlags || []);
  }, [open, initialRole, initialFlags]);

  const handleSubmit = () => {
    if (!roleName.trim() || flags.length === 0) return;
    onSubmit({ role: roleName.trim(), flags });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'edit' ? `Edit role: ${initialRole}` : 'Create role'}</DialogTitle>
      <DialogContent dividers>
        <TextField
          label="Role name"
          fullWidth
          size="small"
          margin="normal"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          disabled={mode === 'edit'}
        />
        <Divider sx={{ my: 2 }} />
        <PermissionPicker value={flags} onChange={setFlags} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!roleName.trim() || flags.length === 0}>
          {mode === 'edit' ? 'Save changes' : 'Create role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
