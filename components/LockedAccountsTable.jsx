import React, { useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { apis } from '../services/commonServices';
import useRefreshStore from '../store/useRefreshStore';
import ConfirmDialog from './ConfirmDialog';
import DataTable from './DataTable';

const ROWS_PER_PAGE_OPTIONS = [5, 7];

const DEFAULT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'mid', label: 'ID' },
  { key: 'role', label: 'Role' },
  { key: 'dep', label: 'Department' },
];

/**
 * A table of locked-out accounts with an Unlock button on each row, paged in
 * the browser. The endpoint is a prop, so the same card serves every screen
 * that unlocks accounts - admin (employees) and reception (patients):
 *
 *   GET   {url}                          -> [{ mid, name, email, dep, role }]
 *   PATCH {url}  body: buildUnlockBody(mid)  -> unlocks that account
 *
 * It fills the height of its parent (a flex column). Mount it only while it
 * is on screen (e.g. inside the active tab) so it re-reads the list each time.
 *
 * @param {string} url - the list + unlock endpoint, e.g. '/admin/lockouts' or '/reception/lockouts'
 * @param {boolean} [canUnlock] - hide the Unlock buttons for a view-only user
 * @param {(mid: string) => object} [buildUnlockBody] - the PATCH body; admin's takes `{ mid, lockout: false }`, reception's just `{ mid }`
 * @param {{key, label, render?}[]} [columns]
 * @param {string} [emptyMessage]
 */
export default function LockedAccountsTable({
  url,
  canUnlock = true,
  buildUnlockBody = (mid) => ({ mid, lockout: false }),
  columns = DEFAULT_COLUMNS,
  emptyMessage = 'No locked-out accounts.',
}) {
  const [rows, setRows] = useState(null); // null = still loading
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [unlockTarget, setUnlockTarget] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest(url);
        if (!cancelled) setRows(data || []);
      } catch (error) {
        if (!cancelled) setRows([]);
      } finally {
        finishRefresh();
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [url, refreshTick]);

  const confirmUnlock = async () => {
    const { mid } = unlockTarget;
    setUnlockTarget(null);
    try {
      await apis.patchRequest(url, buildUnlockBody(mid));
      setRows((prev) => prev.filter((u) => u.mid !== mid));
    } catch (error) {
      // Already toasted by the http client.
    }
  };

  const list = rows ?? [];
  const lastPage = Math.max(0, Math.ceil(list.length / rowsPerPage) - 1);
  const safePage = Math.min(page, lastPage); // unlocking the last row of a page steps back a page

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DataTable
        columns={columns}
        rows={list.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage)}
        getRowKey={(u) => u.mid}
        loading={rows === null}
        emptyMessage={emptyMessage}
        actionsLabel="Action"
        fillHeight
        renderActions={
          canUnlock
            ? (u) => (
                <Button variant="outlined" size="small" onClick={() => setUnlockTarget(u)}>
                  Unlock
                </Button>
              )
            : undefined
        }
        pagination={{
          count: list.length,
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

      <ConfirmDialog
        open={unlockTarget !== null}
        message={`Unlock ${unlockTarget?.name ?? ''} (${unlockTarget?.mid ?? ''})?`}
        onConfirm={confirmUnlock}
        onCancel={() => setUnlockTarget(null)}
      />
    </Box>
  );
}
