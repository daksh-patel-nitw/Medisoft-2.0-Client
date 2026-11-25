import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import DataTable from '../../components/DataTable';
import SearchField from '../../components/SearchField';
import { PAGE_ACCESS } from '../../utils/pageAccess';
import { formatDate } from '../../utils/prescription.util';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];
const SEARCH_DEBOUNCE_MS = 400;
// A member id is 7 letters / digits - the same rule the server enforces on `mid`.
const MID_PATTERN = /^[A-Za-z0-9]{0,7}$/;
const ACTIONS = { CREATE: 'success', UPDATE: 'info', DELETE: 'error' };

function JsonBlock({ title, value }) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {value === undefined || value === null ? (
        <Typography variant="body2" color="text.secondary">
          Not recorded.
        </Typography>
      ) : (
        <Box component="pre" sx={{ m: 0, p: 1, borderRadius: 1, bgcolor: 'action.hover', fontSize: 12, overflow: 'auto', maxHeight: 260 }}>
          {JSON.stringify(value, null, 2)}
        </Box>
      )}
    </Box>
  );
}

/** The before / after of one entry. */
function LogDetailsDialog({ log, onClose }) {
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        {log.action} {log.entity}
        <Typography variant="body2" color="text.secondary">
          {formatDate(log.createdAt)} - by {log.mid}
          {log.ip ? ` - ${log.ip}` : ''}
          {log.method ? ` - ${log.method} ${log.route ?? ''}` : ''}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2">Record id: {log.entityId}</Typography>
          <JsonBlock title="Before" value={log.before} />
          <JsonBlock title="After" value={log.after} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * The audit log: who changed what and when, newest first, paged and filtered ON THE SERVER. Uses the shared table.
 *
 *   GET /admin/logs?page=&limit=&action=&entity=&mid= -> { items: [{ _id, mid, action, entity, entityId, before, after, route, method, ip, createdAt }], total, entities }
 */
export default function LogsPage() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [midText, setMidText] = useState('');
  const [mid, setMid] = useState(''); // the debounced, validated id actually sent
  const [page, setPage] = useState(0); // 0-based for the table; the API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [result, setResult] = useState({ key: null, items: [], total: 0 });
  const [entities, setEntities] = useState([]);
  const [selected, setSelected] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  const midError = !MID_PATTERN.test(midText);

  // Debounce typing; invalid text is never sent.
  useEffect(() => {
    if (midError) return undefined;
    const timer = setTimeout(() => {
      setMid(midText.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [midText, midError]);

  const requestKey = `${action}|${entity}|${mid}|${page}|${rowsPerPage}|${refreshTick}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = await apis.getRequest('/admin/logs', {
          page: page + 1,
          limit: rowsPerPage,
          action: action || undefined,
          entity: entity || undefined,
          mid: mid || undefined,
        });
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) {
        setResult((prev) => ({ key: requestKey, items: data?.items ?? prev.items, total: data?.total ?? prev.total }));
        if (data?.entities) setEntities(data.entities);
        finishRefresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestKey, action, entity, mid, page, rowsPerPage, finishRefresh]);

  const columns = [
    { key: 'createdAt', label: 'When', render: (l) => formatDate(l.createdAt) },
    { key: 'mid', label: 'By' },
    { key: 'action', label: 'Action', render: (l) => <Chip size="small" color={ACTIONS[l.action] ?? 'default'} label={l.action} /> },
    { key: 'entity', label: 'Entity' },
    { key: 'entityId', label: 'Record id' },
    { key: 'ip', label: 'IP', render: (l) => l.ip ?? '-' },
  ];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1200, boxShadow: 3, height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {/* filters (pt: room for the floating labels) */}
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ pt: 1, mb: 2 }}>
            <SearchField
              label="Changed by (member id)"
              value={midText}
              onChange={setMidText}
              error={midError}
              helperText={midError ? 'Up to 7 letters or digits' : undefined}
              sx={{ width: { xs: '100%', sm: 240 } }}
            />
            <TextField
              select
              size="small"
              label="Action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
              sx={{ width: { xs: '100%', sm: 160 } }}
            >
              <MenuItem value="">All actions</MenuItem>
              {Object.keys(ACTIONS).map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Entity"
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(0);
              }}
              sx={{ width: { xs: '100%', sm: 200 } }}
            >
              <MenuItem value="">All entities</MenuItem>
              {entities.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <DataTable
            columns={columns}
            rows={result.items}
            getRowKey={(l) => l._id}
            loading={loading}
            emptyMessage="No log entries found."
            actionsLabel="Details"
            fillHeight
            renderActions={(l) => (
              <Button size="small" variant="outlined" onClick={() => setSelected(l)}>
                View
              </Button>
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

      {selected && <LogDetailsDialog log={selected} onClose={() => setSelected(null)} />}
    </Box>
  );
}

// NEXT.JS SECURITY GATE
LogsPage.layout = 'dashboard';
LogsPage.requiredPermissions = PAGE_ACCESS.auditLogs;
