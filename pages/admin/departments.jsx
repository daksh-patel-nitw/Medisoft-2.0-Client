import React, { useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Divider,
  Skeleton,
  Avatar,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { decodeToFlags } from '../../utils/permissions.util';
import ConfirmDialog from '../../components/ConfirmDialog';
import SearchField from '../../components/SearchField';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// Letters, digits and spaces only - mirrors the backend's
// v_string_space_letters_digits, so '#', '-' etc. are rejected before a round trip.
const DEPARTMENT_PATTERN = /^[\p{L}\p{M}\p{N}\s]+$/u;

// ==========================================
// One department tile. Shows its name, or - while adding/renaming - an input
// with save/cancel in the footer, so nothing opens in a modal.
// ==========================================
const DepartmentTile = ({ name, isEditing, canEdit, canDelete, onStartEdit, onSave, onCancel, onDelete }) => {
  const [draft, setDraft] = useState(name ?? '');
  const trimmed = draft.trim();
  const isValid = trimmed.length > 0 && DEPARTMENT_PATTERN.test(trimmed);
  const showError = draft.length > 0 && !isValid;

  const submit = () => {
    if (isValid) onSave(trimmed);
  };

  return (
    <Card sx={{ boxShadow: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 92 }}>
        <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <LocalHospitalIcon />
        </Avatar>
        {isEditing ? (
          <TextField
            size="small"
            fullWidth
            autoFocus
            label="Department name"
            error={showError}
            helperText={showError ? 'Letters, numbers and spaces only' : ' '}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') onCancel();
            }}
          />
        ) : (
          <Typography variant="h6" fontWeight="500" sx={{ overflowWrap: 'anywhere', textTransform: 'capitalize' }}>
            {name}
          </Typography>
        )}
      </CardContent>

      {(isEditing || canEdit || canDelete) && (
        <CardActions sx={{ justifyContent: 'flex-end', bgcolor: '#f5f5f5', py: 0.5 }}>
          {isEditing ? (
            <>
              <Tooltip title="Save">
                <span>
                  <IconButton color="primary" onClick={submit} disabled={!isValid}>
                    <CheckIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton onClick={onCancel}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              {canEdit && (
                <Tooltip title="Rename">
                  <IconButton color="primary" onClick={onStartEdit}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
              {canDelete && (
                <Tooltip title="Delete">
                  <IconButton color="secondary" onClick={onDelete}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </CardActions>
      )}
    </Card>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function DepartmentsPage({ currentUser }) {
  const [deps, setDeps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [depToDelete, setDepToDelete] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  // Decoded once per currentUser change, reused for every show/hide check on
  // this page - never re-parsed per button.
  const flags = useMemo(() => decodeToFlags(currentUser?.permissions), [currentUser?.permissions]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [depData] = await Promise.all([
          apis.getRequest('/admin/departments'),
          new Promise((resolve) => setTimeout(resolve, 1000))
        ]);
        setDeps(depData || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
        finishRefresh();
      }
    };
    fetchData();
  }, [refreshTick]);

  const filteredDeps = deps.filter((d) => d.toLowerCase().includes(searchVal.toLowerCase()));

  const handleAdd = async (value) => {
    try {
      await apis.postRequest('/admin/departments', { value });
      setDeps((prev) => [...prev, value]);
      setIsAdding(false);
    } catch (error) {
      // Already toasted by the http client; keep the tile open to retry.
    }
  };

  const handleRename = async (oldValue, newValue) => {
    if (newValue === oldValue) {
      setEditingName(null);
      return;
    }
    try {
      await apis.putRequest('/admin/departments', { value: oldValue, updatedValue: newValue });
      setDeps((prev) => prev.map((d) => (d === oldValue ? newValue : d)));
      setEditingName(null);
    } catch (error) {
      // Already toasted by the http client; keep the tile open to retry.
    }
  };

  const confirmDelete = async () => {
    const value = depToDelete;
    setDepToDelete(null);
    try {
      await apis.deleteRequest(`/admin/departments/${encodeURIComponent(value)}`);
      setDeps((prev) => prev.filter((d) => d !== value));
    } catch (error) {}
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Card sx={{ boxShadow: 3, minHeight: '100%' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Departments <Typography component="span" color="text.secondary">({deps.length} Total)</Typography>
          </Typography>
          {/* Search and Add on one line (they only stack on phones). The search box has a fixed width: it must
              not be full-width here, or it takes the whole row and pushes the button underneath. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <SearchField
              fullWidth={false}
              placeholder="Search departments..."
              value={searchVal}
              onChange={setSearchVal}
              sx={{ width: { xs: '100%', sm: 280 } }}
            />
            {flags.has('createDepartment') && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Add New Department
              </Button>
            )}
          </Box>
        </Box>
        <Divider />

        <CardContent>
          {isLoading ? (
            <Grid container spacing={2}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={2}>
              {isAdding && (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <DepartmentTile isEditing onSave={handleAdd} onCancel={() => setIsAdding(false)} />
                </Grid>
              )}

              {filteredDeps.map((dep) => (
                <Grid key={dep} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <DepartmentTile
                    name={dep}
                    isEditing={editingName === dep}
                    canEdit={flags.has('updateDepartment')}
                    canDelete={flags.has('deleteDepartment')}
                    onStartEdit={() => setEditingName(dep)}
                    onSave={(newName) => handleRename(dep, newName)}
                    onCancel={() => setEditingName(null)}
                    onDelete={() => setDepToDelete(dep)}
                  />
                </Grid>
              ))}

              {filteredDeps.length === 0 && !isAdding && (
                <Grid size={{ xs: 12 }}>
                  <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                    No departments found.
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={depToDelete !== null}
        message={`Are you sure you want to delete the "${depToDelete ?? ''}" department?`}
        onConfirm={confirmDelete}
        onCancel={() => setDepToDelete(null)}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
DepartmentsPage.layout = 'dashboard';
DepartmentsPage.requiredPermissions = PAGE_ACCESS.departments;
