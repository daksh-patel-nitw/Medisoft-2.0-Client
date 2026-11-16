import React, { useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Divider,
  Skeleton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { decodeToFlags, encodeFlags } from '../../utils/permissions.util';
import RolesCard from '../../components/RolesCard';
import RoleFormDialog from '../../components/RoleFormDialog';

// ==========================================
// THE SKELETON LOADER COMPONENT
// ==========================================
const ManageListSkeleton = () => (
  <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
    <CardContent>
      <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 8 }}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Grid>
        <Grid size={{ xs: 4 }}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Grid>
      </Grid>
      <Skeleton variant="rectangular" height={40} width="40%" sx={{ mb: 2, borderRadius: 1 }} />
      <Divider sx={{ mb: 2 }} />
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
      ))}
    </CardContent>
  </Card>
);

// ==========================================
// COMPONENT: Departments list (plain string CRUD, GlobalMetadata-backed)
// ==========================================
const DepartmentsCard = ({ items = [], canAdd, canEdit, canDelete, onAdd, onDelete, onEdit }) => {
  const [addVal, setAddVal] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editVal, setEditVal] = useState('');

  const filteredItems = items.filter((item) => item.toLowerCase().includes(searchVal.toLowerCase()));

  const handleAddClick = async () => {
    if (!addVal.trim()) return;
    const success = await onAdd(addVal.trim());
    if (success) setAddVal('');
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditVal(item);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditVal('');
  };

  const handleSaveEdit = async (oldVal) => {
    if (!editVal.trim() || editVal === oldVal) {
      handleCancelEdit();
      return;
    }
    const success = await onEdit(oldVal, editVal.trim());
    if (success) handleCancelEdit();
  };

  return (
    <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Manage Departments
        </Typography>

        {canAdd && (
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid size={{ xs: 8 }}>
              <TextField
                label="Add New Department"
                fullWidth
                variant="outlined"
                size="small"
                value={addVal}
                onChange={(e) => setAddVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClick()}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Button variant="contained" color="primary" fullWidth onClick={handleAddClick} disabled={!addVal.trim()}>
                Add
              </Button>
            </Grid>
          </Grid>
        )}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Search..."
              fullWidth
              variant="outlined"
              size="small"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
          {filteredItems.map((item, idx) => {
            const isEditing = editingItem === item;
            return (
              <Box
                key={idx}
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
                {isEditing ? (
                  <>
                    <TextField
                      size="small"
                      fullWidth
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      sx={{ mr: 1 }}
                      autoFocus
                    />
                    <Box sx={{ display: 'flex' }}>
                      <IconButton color="primary" onClick={() => handleSaveEdit(item)}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton color="secondary" onClick={handleCancelEdit}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography variant="body1" fontWeight="500" sx={{ overflowWrap: 'break-word', maxWidth: '70%' }}>
                      {item}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'nowrap' }}>
                      {canEdit && (
                        <IconButton color="primary" onClick={() => handleStartEdit(item)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton color="secondary" onClick={() => onDelete(item)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            );
          })}

          {filteredItems.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
              No results found.
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function OrganizationPage({ currentUser }) {
  const [deps, setDeps] = useState([]);
  const [roles, setRoles] = useState([]); // [{ role, permissions: string[] (encoded) }]
  const [isLoading, setIsLoading] = useState(true);
  const [dialogState, setDialogState] = useState({ open: false, mode: 'create', role: null, flags: [] });

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  // Decoded once per currentUser change, reused for every show/hide check on
  // this page - never re-parsed per button.
  const flags = useMemo(() => decodeToFlags(currentUser?.permissions), [currentUser?.permissions]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [depData, roleData] = await Promise.all([
        apis.getRequest('/admin/departments'),
        apis.getRequest('/admin/roles'),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
      setDeps(depData || []);
      setRoles(roleData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      finishRefresh();
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTick]);

  // --- Department handlers ---
  const handleDepAdd = async (value) => {
    try {
      await apis.postRequest('/admin/departments', { value });
      setDeps((prev) => [...prev, value]);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleDepEdit = async (oldValue, newValue) => {
    try {
      await apis.putRequest('/admin/departments', { value: oldValue, updatedValue: newValue });
      setDeps((prev) => prev.map((d) => (d === oldValue ? newValue : d)));
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleDepDelete = async (value) => {
    if (!window.confirm(`Are you sure you want to delete the "${value}" department?`)) return;
    try {
      await apis.deleteRequest(`/admin/departments/${encodeURIComponent(value)}`);
      setDeps((prev) => prev.filter((d) => d !== value));
    } catch (error) {}
  };

  // --- Role handlers ---
  const openCreateDialog = () => setDialogState({ open: true, mode: 'create', role: null, flags: [] });

  const openEditDialog = (roleEntry) =>
    setDialogState({
      open: true,
      mode: 'edit',
      role: roleEntry.role,
      flags: Array.from(decodeToFlags(roleEntry.permissions))
    });

  const closeDialog = () => setDialogState((s) => ({ ...s, open: false }));

  const handleRoleSubmit = async ({ role, flags: pickedFlags }) => {
    const permissions = encodeFlags(pickedFlags);
    try {
      if (dialogState.mode === 'edit') {
        await apis.putRequest('/admin/roles', { role, permissions });
        setRoles((prev) => prev.map((r) => (r.role === role ? { role, permissions } : r)));
      } else {
        await apis.postRequest('/admin/roles', { role, permissions });
        setRoles((prev) => [...prev, { role, permissions }]);
      }
      closeDialog();
    } catch (error) {
      // Backend-rejected cases (built-in role, duplicate name) already surface
      // via the global toast interceptor - leave the dialog open so the user
      // can fix the input instead of losing it.
    }
  };

  const handleRoleDelete = async (role) => {
    if (!window.confirm(`Are you sure you want to delete the role "${role}"?`)) return;
    try {
      await apis.deleteRequest(`/admin/roles/${encodeURIComponent(role)}`);
      setRoles((prev) => prev.filter((r) => r.role !== role));
    } catch (error) {
      // Built-in role / role still assigned to an account: backend returns
      // 400 with a message, already toasted globally.
    }
  };

  return (
    <Box>
      {isLoading ? (
        <Grid container spacing={4} alignItems="stretch">
          <Grid size={{ xs: 12, md: 6 }}><ManageListSkeleton /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><ManageListSkeleton /></Grid>
        </Grid>
      ) : (
        <Grid container spacing={4} alignItems="stretch">
          {flags.has('viewRoles') && (
            <Grid size={{ xs: 12, md: 6 }}>
              <RolesCard
                roles={roles}
                canCreate={flags.has('createRole')}
                canUpdate={flags.has('updateRole')}
                canDelete={flags.has('deleteRole')}
                onCreate={openCreateDialog}
                onEdit={openEditDialog}
                onDelete={handleRoleDelete}
              />
            </Grid>
          )}

          {flags.has('viewDepartments') && (
            <Grid size={{ xs: 12, md: 6 }}>
              <DepartmentsCard
                items={deps}
                canAdd={flags.has('createDepartment')}
                canEdit={flags.has('updateDepartment')}
                canDelete={flags.has('deleteDepartment')}
                onAdd={handleDepAdd}
                onEdit={handleDepEdit}
                onDelete={handleDepDelete}
              />
            </Grid>
          )}
        </Grid>
      )}

      <RoleFormDialog
        open={dialogState.open}
        mode={dialogState.mode}
        initialRole={dialogState.role}
        initialFlags={dialogState.flags}
        onClose={closeDialog}
        onSubmit={handleRoleSubmit}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
OrganizationPage.layout = 'dashboard';
OrganizationPage.allowedRoles = ['admin'];
