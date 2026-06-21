import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Divider,
  Skeleton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DomainIcon from '@mui/icons-material/Domain';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';

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
// COMPONENT: Reusable Card for Roles & Departments
// ==========================================
const ManageListCard = ({ title, type, items = [], onAdd, onDelete, onEdit }) => {
  const [addVal, setAddVal] = useState('');
  const [searchVal, setSearchVal] = useState('');

  // Inline Edit State
  const [editingItem, setEditingItem] = useState(null);
  const [editVal, setEditVal] = useState('');

  // Frontend Search Filtering
  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(searchVal.toLowerCase())
  );

  const handleAddClick = async () => {
    if (!addVal.trim()) return;
    const success = await onAdd(type, addVal.trim());
    if (success) setAddVal(''); // Clear input only if API succeeds
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
    const success = await onEdit(type, oldVal, editVal.trim());
    if (success) {
      setEditingItem(null);
      setEditVal('');
    }
  };

  return (
    <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Manage {title}
        </Typography>

        {/* ADD ROW */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid size={{ xs: 8 }}>
            <TextField
              label={`Add New ${title}`}
              fullWidth
              variant="outlined"
              size="small"
              value={addVal}
              onChange={(e) => setAddVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddClick()}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleAddClick}
              disabled={!addVal.trim()}
            >
              Add
            </Button>
          </Grid>
        </Grid>

        {/* SEARCH ROW */}
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

        {/* SCROLLABLE LIST */}
        <Box sx={{ height: '40vh', overflowY: 'auto', pr: 1 }}>
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
                      <IconButton color="primary" onClick={() => handleStartEdit(item)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="secondary" onClick={() => onDelete(type, item)}>
                        <DeleteIcon />
                      </IconButton>
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
export default function OrganizationPage() {
  // Matched to the new backend schema
  const [dataLists, setDataLists] = useState({ deps: [], roles: [] });
  const [isLoading, setIsLoading] = useState(true);
  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  const fetchData = async () => {
    try {
      setIsLoading(true)
      // PROMISE.ALL runs both the API call and the timer simultaneously.
      // It won't resolve until BOTH are completely finished.
      const [data] = await Promise.all([
        apis.getRequest('/admin/rolesDeps'),
        new Promise(resolve => setTimeout(resolve, 1000)) // Enforces 1-second minimum
      ]);
      setDataLists({ deps: data?.deps || [], roles: data?.roles || [] });
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

  // Map API type requirement to our local state keys
  const getListKey = (type) => type === 'role' ? 'roles' : 'deps';

  // --- API HANDLERS ---
  const handleAdd = async (type, value) => {
    try {
      await apis.postRequest('/admin/rolesDeps', { key: type, value });
      const listKey = getListKey(type);

      setDataLists(prev => ({
        ...prev,
        [listKey]: [...prev[listKey], value]
      }));
      return true; // Signals the card to clear the input
    } catch (error) {
      return false;
    }
  };

  const handleEdit = async (type, oldValue, newValue) => {
    try {
      await apis.putRequest('/admin/rolesDeps', {
        key: type,
        value: oldValue,
        updatedValue: newValue
      });
      const listKey = getListKey(type);

      setDataLists(prev => ({
        ...prev,
        [listKey]: prev[listKey].map(item => item === oldValue ? newValue : item)
      }));
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleDelete = async (type, value) => {
    if (!window.confirm(`Are you sure you want to delete ${value} ${type}?`)) return;

    try {
      await apis.deleteRequest(`/admin/rolesDeps/${type}/${encodeURIComponent(value)}`);
      const listKey = getListKey(type);

      setDataLists(prev => ({
        ...prev,
        [listKey]: prev[listKey].filter(item => item !== value)
      }));
    } catch (error) {
    }
  };


  return (
    <Box>
    
      {isLoading ?
        <Grid container spacing={4} alignItems="stretch">
          <Grid size={{ xs: 12, md: 6 }}><ManageListSkeleton /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><ManageListSkeleton /></Grid>
        </Grid>
        :
        <Grid container spacing={4} alignItems="stretch">

          {/* ROLES CARD */}
          <Grid size={{ xs: 12, md: 6 }}>
            <ManageListCard
              title="Roles"
              type="role" // Exact string the backend expects
              items={dataLists.roles}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Grid>

          {/* DEPARTMENTS CARD */}
          <Grid size={{ xs: 12, md: 6 }}>
            <ManageListCard
              title="Departments"
              type="department" // Exact string the backend expects
              items={dataLists.deps}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Grid>

        </Grid>
      }
    </Box>
  );
}

// NEXT.JS SECURITY GATE
OrganizationPage.layout = 'dashboard';
OrganizationPage.allowedRoles = ['admin'];