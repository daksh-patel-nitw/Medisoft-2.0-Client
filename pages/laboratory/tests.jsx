import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import SearchField from '../../components/SearchField';
import LabTestEditDialog from '../../components/LabTestEditDialog';
import { PAGE_ACCESS } from '../../utils/pageAccess';

const ROWS_PER_PAGE_OPTIONS = [10, 20];

const COLUMNS = [
  { key: 'name', label: 'Test name', minWidth: 140 },
  { key: 'price', label: 'Price (₹)', align: 'right', render: (t) => `₹${Number(t.price).toFixed(2)}` },
  {
    key: 'pat_details',
    label: 'Details to collect',
    minWidth: 200,
    render: (t) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {t.pat_details && (
          <Typography variant="body2">
            {t.pat_details} <em>({t.pat_details_mandatory ? 'required' : 'optional'})</em>
          </Typography>
        )}
        {(t.default_details ?? []).map((d) => (
          <Typography key={d.name} variant="body2">
            ☐ {d.name} <em>({d.mandatory ? 'required' : 'optional'})</em>
          </Typography>
        ))}
        {!t.pat_details && (t.default_details ?? []).length === 0 && <Typography variant="body2">-</Typography>}
      </Box>
    ),
  },
  { key: 'normal', label: 'Normal range' },
  {
    key: 'timing',
    label: 'Timings',
    minWidth: 200,
    render: (t) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {(t.timing ?? []).map((slot, i) => (
          <Typography key={slot} variant="body2">
            <strong>{i + 1})</strong> {slot}
          </Typography>
        ))}
      </Box>
    ),
  },
];

export default function ManageTestsPage() {
  const [tests, setTests] = useState(null); // null = still loading
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  // GET /laboratory returns every active test (there is no server paging), so
  // searching and paging are done here.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest('/laboratory');
        if (!cancelled) setTests(data || []);
      } catch (error) {
        if (!cancelled) setTests([]);
      } finally {
        finishRefresh();
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick, reloadKey]);

  const needle = search.trim().toLowerCase();
  const rows = (tests ?? []).filter((t) => !needle || t.name?.toLowerCase().includes(needle));
  const lastPage = Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1);
  const safePage = Math.min(page, lastPage); // deleting the last row of a page steps back a page

  const saveEdit = async (payload) => {
    try {
      await apis.putRequest('/laboratory', payload);
      setEditing(null);
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      return false; // toasted by the http client; the dialog stays open with the values
    }
  };

  const confirmDelete = async () => {
    const { _id } = toDelete;
    setToDelete(null);
    try {
      await apis.deleteRequest(`/laboratory/${encodeURIComponent(_id)}`);
      setReloadKey((k) => k + 1);
    } catch (error) {
      // Already toasted by the http client.
    }
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Card sx={{ boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {/* pt: room for the outlined field's floating label */}
          <Box sx={{ pt: 1, mb: 2, maxWidth: 400 }}>
            <SearchField
              label="Search by test name"
              value={search}
              onChange={(text) => {
                setSearch(text);
                setPage(0);
              }}
            />
          </Box>

          <DataTable
            columns={COLUMNS}
            rows={rows.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage)}
            getRowKey={(t) => t._id}
            loading={tests === null}
            emptyMessage="No laboratory tests found."
            actionsLabel="Actions"
            fillHeight
            renderActions={(t) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Tooltip title="Edit">
                  <IconButton color="primary" size="small" onClick={() => setEditing(t)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton color="error" size="small" onClick={() => setToDelete(t)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            pagination={{
              count: rows.length,
              page: safePage,
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

      {/* Mounted only while editing so the form always starts from that test's values. */}
      {editing && <LabTestEditDialog key={editing._id} test={editing} onSave={saveEdit} onCancel={() => setEditing(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        message={`Delete the test "${toDelete?.name ?? ''}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
ManageTestsPage.layout = 'dashboard';
ManageTestsPage.requiredPermissions = PAGE_ACCESS.labTests;
