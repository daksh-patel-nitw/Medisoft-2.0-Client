import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, Chip, IconButton, Tooltip, TextField, MenuItem, Autocomplete } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import useRoomDepartmentsStore from '../../store/useRoomDepartmentsStore';
import RoomEditDialog from '../../components/RoomEditDialog';
import { ROOM_STATUSES } from '../../components/RoomForm';
import { PAGE_ACCESS } from '../../utils/pageAccess';

const ROWS_PER_PAGE_OPTIONS = [10, 20];
const statusLabel = (value) => ROOM_STATUSES.find((s) => s.value === value)?.label ?? value;

const COLUMNS = [
  { key: 'room_no', label: 'Room' },
  { key: 'floor', label: 'Floor', align: 'right' },
  { key: 'department', label: 'Department', render: (r) => <span style={{ textTransform: 'capitalize' }}>{r.department}</span> },
  { key: 'category', label: 'Category', render: (r) => <Chip size="small" variant="outlined" color="primary" label={r.category?.name ?? '-'} /> },
  { key: 'beds', label: 'Beds', align: 'right' },
  {
    key: 'status',
    label: 'Status',
    render: (r) => <Chip size="small" color={r.status === 'IU' ? 'success' : r.status === 'f' ? 'warning' : 'default'} label={statusLabel(r.status)} />,
  },
];

export default function RoomsPage() {
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState(''); // '' = every category
  const [department, setDepartment] = useState(''); // '' = every department
  const { departments, load: loadDepartments } = useRoomDepartmentsStore();
  const [page, setPage] = useState(0); // 0-based for the table; the API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], total: 0 });
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // Categories for the filter and the edit dialog.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest('/room/category');
        if (!cancelled) setCategories(data || []);
      } catch (error) {
        // Already toasted by the http client.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // `loading` is derived from which request the data belongs to, so nothing
  // sets state synchronously inside the effect.
  const requestKey = `${page}|${rowsPerPage}|${categoryFilter}|${department}|${reloadKey}|${refreshTick}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = { page: page + 1, limit: rowsPerPage };
        if (categoryFilter) params.type = categoryFilter;
        if (department) params.department = department;
        const data = await apis.getRequest('/room', params);
        if (!cancelled) setResult({ key: requestKey, items: data?.rooms ?? [], total: data?.total ?? 0 });
      } catch (error) {
        if (!cancelled) setResult({ key: requestKey, items: [], total: 0 });
      } finally {
        finishRefresh();
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const saveEdit = async (payload) => {
    try {
      await apis.putRequest('/room', payload);
      setEditing(null);
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      return false; // toasted by the http client; the dialog stays open with the values
    }
  };

  const confirmDelete = async () => {
    const { id } = toDelete;
    setToDelete(null);
    try {
      await apis.deleteRequest(`/room/${encodeURIComponent(id)}`);
      // Deleting the last row of a page steps back one page instead of showing an empty one.
      if (result.items.length === 1 && page > 0) setPage(page - 1);
      else setReloadKey((k) => k + 1);
    } catch (error) {
      // e.g. the room has active admissions - already toasted by the http client.
    }
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Card sx={{ boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {/* filters; pt: room for the floating labels */}
          <Box sx={{ pt: 1, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* a dropdown of the hospital's departments - type to narrow it, pick one to filter */}
            <Autocomplete
              size="small"
              options={departments}
              value={department || null}
              onChange={(e, next) => {
                setDepartment(next || '');
                setPage(0);
              }}
              noOptionsText="No matching department"
              getOptionLabel={(d) => d.charAt(0).toUpperCase() + d.slice(1)}
              renderInput={(params) => <TextField {...params} label="Filter by department" />}
              sx={{ width: { xs: '100%', sm: 260 } }}
            />
            <TextField
              select
              size="small"
              label="Category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              sx={{ width: { xs: '100%', sm: 220 } }}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <DataTable
            columns={COLUMNS}
            rows={result.items}
            getRowKey={(r) => r.id}
            loading={loading}
            emptyMessage="No rooms found."
            actionsLabel="Actions"
            fillHeight
            renderActions={(r) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title="Edit">
                  <IconButton color="primary" size="small" onClick={() => setEditing(r)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton color="error" size="small" onClick={() => setToDelete(r)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            pagination={{
              count: result.total,
              page,
              rowsPerPage,
              rowsPerPageOptions: ROWS_PER_PAGE_OPTIONS,
              onPageChange: (e, newPage) => setPage(newPage),
              onRowsPerPageChange: (e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Mounted only while editing so the form always starts from that room. */}
      {editing && <RoomEditDialog key={editing.id} room={editing} categories={categories} departments={departments} onSave={saveEdit} onCancel={() => setEditing(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        message={`Delete room ${toDelete?.room_no ?? ''} (${toDelete?.department ?? ''})?`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
RoomsPage.layout = 'dashboard';
RoomsPage.requiredPermissions = PAGE_ACCESS.roomList;
