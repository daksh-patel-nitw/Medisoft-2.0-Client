import { useState } from 'react';
import { Card, CardContent, Typography, Box, Divider, TextField, IconButton, Chip, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { PERMISSION_MODULES } from '../utils/permissions.util';

function permissionSummary(encodedPermissions = []) {
  let granted = 0;
  let total = 0;
  for (const code of encodedPermissions) {
    const match = code.match(/^([A-Za-z]+)([01]+)$/);
    if (!match) continue;
    const [, prefix, bits] = match;
    if (!PERMISSION_MODULES[prefix.toUpperCase()]) continue;
    granted += bits.split('').filter((b) => b === '1').length;
    total += bits.length;
  }
  return { granted, total };
}

// canCreate/canUpdate/canDelete come from the viewer's own decoded
// permission flags - a user without `updateRole`/`deleteRole` simply never
// sees those icons, same way a doctor never sees this card at all.
export default function RolesCard({ roles, canCreate, canUpdate, canDelete, onCreate, onEdit, onDelete }) {
  const [searchVal, setSearchVal] = useState('');
  const filteredRoles = roles.filter((r) => r.role.toLowerCase().includes(searchVal.toLowerCase()));

  return (
    <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">Manage Roles</Typography>
          {canCreate && (
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
              New role
            </Button>
          )}
        </Box>

        <TextField
          label="Search..."
          fullWidth
          variant="outlined"
          size="small"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
          {filteredRoles.map((r) => {
            const { granted, total } = permissionSummary(r.permissions);
            return (
              <Box
                key={r.role}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  mb: 1,
                  bgcolor: '#f8f9fa',
                  borderRadius: 1,
                  minHeight: '48px'
                }}
              >
                <Box>
                  <Typography variant="body1" fontWeight="500">{r.role}</Typography>
                  <Chip size="small" label={`${granted}/${total} permissions`} sx={{ mt: 0.5 }} />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'nowrap' }}>
                  {canUpdate && (
                    <IconButton color="primary" onClick={() => onEdit(r)}>
                      <EditIcon />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton color="secondary" onClick={() => onDelete(r.role)}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
            );
          })}

          {filteredRoles.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
              No roles found.
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
