import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  Box,
  TextField,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Delete, Edit, Add } from '@mui/icons-material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { decodeToFlags } from '../../utils/permissions.util';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import SearchField from '../../components/SearchField';
import MedicineEditDialog from '../../components/MedicineEditDialog';
import AddStockDialog from '../../components/AddStockDialog';
import { PAGE_ACCESS } from '../../utils/pageAccess';

const ROWS_PER_PAGE_OPTIONS = [10, 20];
// The API only searches from 3 characters, and only letters/digits/spaces.
const MIN_SEARCH_LENGTH = 3;
const SEARCH_PATTERN = /^[\p{L}\p{M}\p{N}\s]*$/u;
const SEARCH_DEBOUNCE_MS = 400;

const COLUMNS = [
  { key: 'name', label: 'Medicine name' },
  {
    key: 't',
    label: 'Category',
    render: (m) => <Chip size="small" variant="outlined" color="primary" label={m.t?.name ?? '-'} />,
  },
  { key: 'ps', label: 'Pack size', align: 'right' },
  { key: 'ps_u', label: 'Packs in stock', align: 'right' },
  { key: 'ps_c', label: 'Loose pcs', align: 'right', render: (m) => m.ps_c ?? 0 },
  {
    key: 'total',
    label: 'Total units',
    align: 'right',
    render: (m) => Number(m.ps_u) * Number(m.ps) + Number(m.ps_c ?? 0),
  },
  { key: 'price', label: 'Price (₹/unit)', align: 'right', render: (m) => `₹${Number(m.price).toFixed(2)}` },
];

export default function InventoryPage({ currentUser }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced, validated search actually sent
  const [page, setPage] = useState(0); // 0-based for the table; the API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [stocking, setStocking] = useState(null); // medicine getting stock added
  const [toDelete, setToDelete] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  // Decoded once per currentUser change, reused for every show/hide check.
  const flags = useMemo(() => decodeToFlags(currentUser?.permissions), [currentUser?.permissions]);
  const canManage = flags.has('manageMedicines');
  // Editing needs the category list, which is its own permission - without it
  // there is nothing to choose from, so the edit button stays hidden.
  const canEdit = canManage && flags.has('viewMedicineCategories');

  const searchError = !SEARCH_PATTERN.test(search);
  const searchTooShort = search.trim().length > 0 && search.trim().length < MIN_SEARCH_LENGTH;

  // Debounce typing; invalid or too-short text is not sent (the list stays as it was).
  useEffect(() => {
    if (searchError) return undefined;
    const trimmed = search.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH) return undefined;
    const timer = setTimeout(() => {
      setQuery(trimmed);
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, searchError]);

  // Categories for the edit dialog.
  useEffect(() => {
    if (!canEdit) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest('/pharmacy/types');
        if (!cancelled) setCategories(data || []);
      } catch (error) {
        // Already toasted by the http client.
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  // `loading` is derived from which request the data belongs to, so nothing
  // sets state synchronously inside the effect.
  const requestKey = `${page}|${rowsPerPage}|${query}|${reloadKey}|${refreshTick}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = { page: page + 1, limit: rowsPerPage };
        if (query) params.query = query;
        const data = await apis.getRequest('/pharmacy', params);
        if (!cancelled) setResult({ key: requestKey, items: data?.medicines ?? [], total: data?.total ?? 0 });
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
      await apis.putRequest('/pharmacy', payload);
      setEditing(null);
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      return false; // toasted by the http client; the dialog stays open with the values
    }
  };

  // PUT /pharmacy/increment ADDS the amounts to the current stock.
  const saveStock = async (payload) => {
    try {
      await apis.putRequest('/pharmacy/increment', payload);
      setStocking(null);
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
      await apis.deleteRequest(`/pharmacy/${encodeURIComponent(_id)}`);
      // Deleting the last row of a page steps back one page instead of showing an empty one.
      if (result.items.length === 1 && page > 0) setPage(page - 1);
      else setReloadKey((k) => k + 1);
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
              label="Search medicines"
              value={search}
              onChange={setSearch}
              error={searchError}
              helperText={
                searchError ? 'Letters and numbers only' : searchTooShort ? `Type at least ${MIN_SEARCH_LENGTH} characters` : undefined
              }
            />
          </Box>

          <DataTable
            columns={COLUMNS}
            rows={result.items}
            getRowKey={(m) => m._id}
            loading={loading}
            emptyMessage="No medicines found in inventory."
            actionsLabel="Actions"
            fillHeight
            renderActions={
              canManage
                ? (m) => (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title="Add stock">
                        <IconButton color="success" size="small" onClick={() => setStocking(m)}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip title="Edit">
                          <IconButton color="primary" size="small" onClick={() => setEditing(m)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton color="error" size="small" onClick={() => setToDelete(m)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )
                : undefined
            }
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

      {/* Mounted only while editing so the form always starts from that medicine's values. */}
      {editing && (
        <MedicineEditDialog
          key={editing._id}
          medicine={editing}
          categories={categories}
          onSave={saveEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {stocking && <AddStockDialog key={stocking._id} medicine={stocking} onSave={saveStock} onCancel={() => setStocking(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        message={`Delete the medicine "${toDelete?.name ?? ''}"? It will be removed from the inventory.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
InventoryPage.layout = 'dashboard';
InventoryPage.requiredPermissions = PAGE_ACCESS.pharmacyInventory;
