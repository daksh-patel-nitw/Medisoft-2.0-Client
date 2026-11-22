import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  TextField,
  Chip,
  Box,
  Typography,
  Skeleton
} from '@mui/material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { decodeToFlags } from '../../utils/permissions.util';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import LockedAccountsTable from '../../components/LockedAccountsTable';
import SearchField from '../../components/SearchField';
import { PAGE_ACCESS } from '../../utils/pageAccess';

const ROWS_PER_PAGE_OPTIONS = [5, 7];
// Same rule the server enforces on the search text (letters, digits, spaces).
const SEARCH_PATTERN = /^[\p{L}\p{M}\p{N}\s]*$/u;
const SEARCH_DEBOUNCE_MS = 400;

const BASE_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'mid', label: 'ID' },
  { key: 'role', label: 'Role' },
  { key: 'dep', label: 'Department' },
];

// ==========================================
// TAB 2: every employee account, paged and searched ON THE SERVER, + lock
// ==========================================
function LockEmployeeTab({ currentUserMid }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // the debounced, validated search actually sent
  const [page, setPage] = useState(0); // 0-based for the table; the API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], total: 0 });
  const [lockTarget, setLockTarget] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  const searchError = !SEARCH_PATTERN.test(search);

  // Debounce typing so every keystroke isn't a request; invalid text is never sent.
  useEffect(() => {
    if (searchError) return undefined;
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, searchError]);

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
        const data = await apis.getRequest('/admin/lockouts/accounts', params);
        if (!cancelled) setResult({ key: requestKey, items: data?.items ?? [], total: data?.total ?? 0 });
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

  const columns = useMemo(
    () => [
      ...BASE_COLUMNS,
      {
        key: 'lockout',
        label: 'Status',
        render: (u) =>
          u.lockout ? <Chip size="small" color="error" label="Locked" /> : <Chip size="small" color="success" variant="outlined" label="Active" />,
      },
    ],
    []
  );

  const confirmLock = async () => {
    const { mid } = lockTarget;
    setLockTarget(null);
    try {
      await apis.patchRequest('/admin/lockouts', { mid, lockout: true });
      setReloadKey((k) => k + 1); // re-read the current page from the server
    } catch (error) {
      // Already toasted by the http client.
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* pt: room for the outlined field's floating label inside the scrolling card */}
      <Box sx={{ pt: 1.5, mb: 2, maxWidth: 360 }}>
        <SearchField
          label="Search by name or ID"
          value={search}
          onChange={setSearch}
          error={searchError}
          helperText={searchError ? 'Letters and numbers only' : undefined}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={result.items}
        getRowKey={(u) => u.mid}
        loading={loading}
        emptyMessage="No records available."
        actionsLabel="Action"
        fillHeight
        renderActions={(u) =>
          u.lockout || u.mid === currentUserMid ? null : (
            <Button variant="outlined" color="error" size="small" onClick={() => setLockTarget(u)}>
              Lock
            </Button>
          )
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

      <ConfirmDialog
        open={lockTarget !== null}
        message={`Lock ${lockTarget?.name ?? ''} (${lockTarget?.mid ?? ''})? They will not be able to sign in until unlocked.`}
        onConfirm={confirmLock}
        onCancel={() => setLockTarget(null)}
      />
    </Box>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function LockoutsPage({ currentUser }) {
  const [tab, setTab] = useState('locked');

  // Decoded once per currentUser change; viewing is the page gate, locking/unlocking is its own permission.
  const flags = useMemo(() => decodeToFlags(currentUser?.permissions), [currentUser?.permissions]);
  const canChangeLockout = flags.has('updateLockout');

  return (
    // One card, centered horizontally, filling the height the layout leaves.
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1000, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <Tabs
          value={tab}
          indicatorColor="primary"
          textColor="primary"
          onChange={(e, next) => setTab(next)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
        >
          <Tab value="locked" label="Locked Employees" />
          {canChangeLockout && <Tab value="lock" label="Lock Employee" />}
        </Tabs>

        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', pb: '16px !important' }}>
          {/* the shared locked-accounts card, pointed at the admin endpoint (employees only) */}
          {tab === 'locked' && (
            <LockedAccountsTable url="/admin/lockouts" canUnlock={canChangeLockout} emptyMessage="No locked-out employees." />
          )}
          {tab === 'lock' && canChangeLockout && <LockEmployeeTab currentUserMid={currentUser?.mid} />}
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
LockoutsPage.layout = 'dashboard';
LockoutsPage.requiredPermissions = PAGE_ACCESS.lockouts;
