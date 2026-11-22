import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Tabs, Tab, Box, Button, Chip } from '@mui/material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { decodeToFlags } from '../../utils/permissions.util';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import SearchField from '../../components/SearchField';
import { PAGE_ACCESS } from '../../utils/pageAccess';

const ROWS_PER_PAGE_OPTIONS = [10, 20];
// The API's search takes letters, digits and spaces (the patient's name or id).
const SEARCH_PATTERN = /^[\p{L}\p{M}\p{N}\s]*$/u;
const SEARCH_DEBOUNCE_MS = 400;

// RoomPrescriptionStatus on the server
const STATUS = {
  s: { label: 'Scheduled', color: 'default' },
  a: { label: 'Admitted', color: 'primary' },
  rb: { label: 'Ready for billing', color: 'warning' },
  b: { label: 'Billed', color: 'info' },
  sh: { label: 'Shifted', color: 'default' },
  d: { label: 'Discharged', color: 'success' },
  c: { label: 'Cancelled', color: 'error' },
};
// An admission that is already over can't be cancelled.
const NOT_CANCELLABLE = ['d', 'c', 'sh'];

const formatDate = (value) => (value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-');

const COLUMNS = [
  { key: 'pname', label: 'Patient' },
  { key: 'patient_id', label: 'Patient ID' },
  { key: 'dname', label: 'Doctor' },
  { key: 'room', label: 'Room', render: (p) => (p.room_id ? `${p.room_id.room_no} · ${p.room_id.department}` : '-') },
  { key: 'addmited_at', label: 'Admitted', render: (p) => formatDate(p.addmited_at) },
  { key: 'status', label: 'Status', render: (p) => <Chip size="small" color={STATUS[p.status]?.color ?? 'default'} label={STATUS[p.status]?.label ?? p.status} /> },
];

/**
 * What each tab lists and what it can do:
 *   admitted - active admissions        -> "Ready for billing"
 *   billed   - billed, awaiting release -> "Discharge"
 *   all      - every admission          -> "Cancel" (while the stay isn't over)
 */
const TABS = {
  admitted: { label: 'Admitted', status: 'a' },
  billed: { label: 'Billed', status: 'b' },
  all: { label: 'All patients', status: 'all' },
};

function AdmissionsTab({ tab, flags }) {
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState(''); // the debounced, validated text actually sent
  const [page, setPage] = useState(0); // 0-based for the table; the API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], total: 0 });
  const [pending, setPending] = useState(null); // { action: 'bill' | 'discharge' | 'cancel', row }

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  const searchError = !SEARCH_PATTERN.test(searchText);

  // Debounce typing; invalid text is never sent.
  useEffect(() => {
    if (searchError) return undefined;
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText, searchError]);

  // `loading` is derived from which request the data belongs to, so nothing
  // sets state synchronously inside the effect.
  const status = TABS[tab].status;
  const requestKey = `${status}|${page}|${rowsPerPage}|${search}|${reloadKey}|${refreshTick}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = { status, page: page + 1, limit: rowsPerPage };
        if (search) params.search = search;
        const data = await apis.getRequest('/room/prescription', params);
        if (!cancelled) setResult({ key: requestKey, items: data?.prescriptions ?? [], total: data?.total ?? 0 });
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

  const confirm = async () => {
    const { action, row } = pending;
    setPending(null);
    try {
      if (action === 'bill') {
        // `date` is kept as the discharge date; billing starts from now.
        await apis.putRequest('/room/prescription/bill', { id: row._id, date: new Date().toISOString() });
      } else if (action === 'discharge') {
        await apis.putRequest('/room/prescription', { id: row._id });
      } else {
        await apis.deleteWithBodyRequest('/room/prescription', { id: row._id });
      }
      setReloadKey((k) => k + 1);
    } catch (error) {
      // Already toasted by the http client.
    }
  };

  const message = pending
    ? {
        bill: `Mark ${pending.row.pname || pending.row.patient_id} ready for billing?`,
        discharge: `Discharge ${pending.row.pname || pending.row.patient_id}? The bed will be freed.`,
        cancel: `Cancel the admission of ${pending.row.pname || pending.row.patient_id}? The bed will be freed.`,
      }[pending.action]
    : '';

  const renderActions = (row) => {
    if (tab === 'admitted' && flags.has('billRoomPrescription')) {
      return (
        <Button variant="contained" size="small" onClick={() => setPending({ action: 'bill', row })}>
          Ready for billing
        </Button>
      );
    }
    if (tab === 'billed' && flags.has('dischargePatient')) {
      return (
        <Button variant="contained" color="success" size="small" onClick={() => setPending({ action: 'discharge', row })}>
          Discharge
        </Button>
      );
    }
    if (tab === 'all' && flags.has('cancelAdmission') && !NOT_CANCELLABLE.includes(row.status)) {
      return (
        <Button variant="outlined" color="error" size="small" onClick={() => setPending({ action: 'cancel', row })}>
          Cancel
        </Button>
      );
    }
    return null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* pt: room for the field's floating label */}
      <Box sx={{ pt: 1, mb: 2, maxWidth: 400 }}>
        <SearchField
          label="Search by patient name or ID"
          value={searchText}
          onChange={setSearchText}
          error={searchError}
          helperText={searchError ? 'Letters and numbers only' : undefined}
        />
      </Box>

      <DataTable
        columns={COLUMNS}
        rows={result.items}
        getRowKey={(p) => p._id}
        loading={loading}
        emptyMessage="No patients found."
        actionsLabel="Action"
        fillHeight
        renderActions={renderActions}
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

      <ConfirmDialog open={pending !== null} message={message} onConfirm={confirm} onCancel={() => setPending(null)} />
    </Box>
  );
}

export default function AdmissionsPage({ currentUser }) {
  const [tab, setTab] = useState('admitted');

  // Decoded once per currentUser change; viewing is the page gate, each action has its own permission.
  const flags = useMemo(() => decodeToFlags(currentUser?.permissions), [currentUser?.permissions]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1100, boxShadow: 3, height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <Tabs
          value={tab}
          indicatorColor="primary"
          textColor="primary"
          onChange={(e, next) => setTab(next)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
        >
          {Object.entries(TABS).map(([value, { label }]) => (
            <Tab key={value} value={value} label={label} />
          ))}
        </Tabs>

        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {/* keyed by tab so each tab starts with its own search, page and list */}
          <AdmissionsTab key={tab} tab={tab} flags={flags} />
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
AdmissionsPage.layout = 'dashboard';
AdmissionsPage.requiredPermissions = PAGE_ACCESS.roomAdmissions;
