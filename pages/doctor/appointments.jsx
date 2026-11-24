import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, IconButton, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import EmergencyIcon from '@mui/icons-material/LocalHospital';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import SearchField from '../../components/SearchField';
import OpdVisitDialog from '../../components/OpdVisitDialog';
import { PAGE_ACCESS } from '../../utils/pageAccess';
import { formatDate } from '../../utils/prescription.util';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50];
const SEARCH_PATTERN = /^[\p{L}\p{M}\p{N}\s]*$/u;
const SEARCH_DEBOUNCE_MS = 400;

// AppointmentStatus on the server
const STATUS = {
  P: { label: 'Booked (not paid)', color: 'default' },
  B: { label: 'Paid - waiting', color: 'info' },
  I: { label: 'In the queue', color: 'warning' },
  D: { label: 'With the doctor', color: 'primary' },
  Done: { label: 'Seen', color: 'success' },
  C: { label: 'Cancelled', color: 'error' },
};
// a patient who is still ahead of the doctor: the only ones who can be given priority
const WAITING = ['P', 'B', 'I'];

/**
 * The doctor's own OPD appointments: patient, date and status, one page at a time, with a star to take a waiting
 * patient first, a button to open a visit (change its medicines and tests within 2 days) and emergency leave for
 * today. Uses the shared table.
 *
 *   GET /doctor/appointments?page=&limit=&status=&query= -> { items: [{ _id, pname, schedule_date, status, priority, editableUntil }], total }
 */
export default function DoctorAppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState(''); // the debounced, validated text actually sent
  const [page, setPage] = useState(0); // 0-based for the table; the API is 1-based
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], total: 0 });
  const [openVisit, setOpenVisit] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

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

  const requestKey = `${statusFilter}|${page}|${rowsPerPage}|${search}|${reloadKey}|${refreshTick}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = await apis.getRequest('/doctor/appointments', { page: page + 1, limit: rowsPerPage, status: statusFilter || undefined, query: search || undefined });
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) {
        setResult((prev) => ({ key: requestKey, items: data?.items ?? prev.items, total: data?.total ?? prev.total }));
        finishRefresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestKey, statusFilter, page, rowsPerPage, search, finishRefresh]);

  const reload = () => setReloadKey((k) => k + 1);

  // PUT /doctor/appointments/priority { aid, priority }
  const togglePriority = async (row) => {
    try {
      await apis.putRequest('/doctor/appointments/priority', { aid: row._id, priority: !row.priority });
      reload();
    } catch (error) {
      // already toasted by the http client
    }
  };

  // POST /doctor/emergency-leave
  const takeLeave = async () => {
    setConfirmLeave(false);
    try {
      await apis.postRequest('/doctor/emergency-leave');
      reload();
    } catch (error) {
      // already toasted by the http client
    }
  };

  const columns = [
    { key: 'pname', label: 'Patient' },
    { key: 'schedule_date', label: 'Appointment', render: (a) => formatDate(a.schedule_date) },
    {
      key: 'status',
      label: 'Status',
      render: (a) => <Chip size="small" color={STATUS[a.status]?.color ?? 'default'} variant={a.status === 'C' ? 'outlined' : 'filled'} label={STATUS[a.status]?.label ?? a.status} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      align: 'center',
      render: (a) =>
        WAITING.includes(a.status) ? (
          <Tooltip title={a.priority ? 'Priority - taken first (click to remove)' : 'Take this patient first'}>
            <IconButton size="small" color={a.priority ? 'warning' : 'default'} onClick={() => togglePriority(a)} aria-label="Toggle priority">
              {a.priority ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>
        ) : a.priority ? (
          <StarIcon fontSize="small" color="disabled" />
        ) : null,
    },
  ];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1100, boxShadow: 3, height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {/* filters (pt: room for the floating labels) and the emergency leave button */}
          <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ pt: 1, mb: 2 }}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <SearchField
                label="Search by patient name"
                value={searchText}
                onChange={setSearchText}
                error={searchError}
                helperText={searchError ? 'Letters and numbers only' : undefined}
                sx={{ width: { xs: '100%', sm: 280 } }}
              />
              <TextField
                select
                size="small"
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ width: { xs: '100%', sm: 200 } }}
              >
                <MenuItem value="">All statuses</MenuItem>
                {Object.entries(STATUS).map(([code, { label }]) => (
                  <MenuItem key={code} value={code}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Button color="error" variant="outlined" startIcon={<EmergencyIcon />} onClick={() => setConfirmLeave(true)}>
              Emergency leave
            </Button>
          </Stack>

          <DataTable
            columns={columns}
            rows={result.items}
            getRowKey={(a) => a._id}
            loading={loading}
            emptyMessage="No appointments found."
            actionsLabel="Visit"
            fillHeight
            renderActions={(a) =>
              a.status === 'Done' ? (
                <Button size="small" variant="outlined" onClick={() => setOpenVisit(a)}>
                  {a.editableUntil && new Date(a.editableUntil) >= new Date() ? 'Edit' : 'View'}
                </Button>
              ) : null
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

      {/* mounted only while open so it always starts from that visit */}
      {openVisit && (
        <OpdVisitDialog
          key={openVisit._id}
          appointment={openVisit}
          onClose={() => {
            setOpenVisit(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmLeave}
        message="Take emergency leave for today? Every appointment of yours today that has not been seen yet will be cancelled, each patient will be emailed that you are on emergency leave and asked to book another date, and nobody can book you for today. This cannot be undone here."
        onConfirm={takeLeave}
        onCancel={() => setConfirmLeave(false)}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
DoctorAppointmentsPage.layout = 'dashboard';
DoctorAppointmentsPage.requiredPermissions = PAGE_ACCESS.doctorAppointments;
