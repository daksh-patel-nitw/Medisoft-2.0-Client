import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, Button, IconButton, Tooltip, Typography, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import VitalsDialog from '../../components/VitalsDialog';
import { browserTimeZone } from '../../utils/timeZone';
import { PAGE_ACCESS } from '../../utils/pageAccess';

const ROWS_PER_PAGE_OPTIONS = [10, 20];

const formatTime = (value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Today's booked patients for the signed-in user's own department. For each
 * one the receptionist takes the vitals (which confirms the arrival and sends
 * the patient on to the doctor's queue) or cancels the appointment.
 *
 *   GET    /reception/r2patients?dep=&timeZone=         the day's booked patients
 *   POST   /reception/updateAppointment                 vitals + confirm arrival
 *   DELETE /reception/deleteAppointment?id=&userTimezone=  cancel (the patient is emailed)
 */
export default function TodaysAppointmentsPage({ currentUser }) {
  const dep = currentUser?.dep;
  const [rows, setRows] = useState(null); // null = still loading
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);
  const [reloadKey, setReloadKey] = useState(0);
  const [vitalsFor, setVitalsFor] = useState(null);
  const [toCancel, setToCancel] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  useEffect(() => {
    if (!dep) {
      finishRefresh();
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest('/reception/r2patients', { dep, timeZone: browserTimeZone() });
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
  }, [dep, refreshTick, reloadKey]);

  const saveVitals = async (payload) => {
    try {
      await apis.postRequest('/reception/updateAppointment', payload);
      setVitalsFor(null);
      setReloadKey((k) => k + 1); // the patient is now with the doctor's queue - no longer listed here
      return true;
    } catch (error) {
      return false; // toasted by the http client; the dialog stays open with the values
    }
  };

  const confirmCancel = async () => {
    const { _id } = toCancel;
    setToCancel(null);
    try {
      await apis.deleteRequest(`/reception/deleteAppointment?id=${encodeURIComponent(_id)}&userTimezone=${encodeURIComponent(browserTimeZone())}`);
      setReloadKey((k) => k + 1);
    } catch (error) {
      // Already toasted by the http client.
    }
  };

  const list = rows ?? [];
  const lastPage = Math.max(0, Math.ceil(list.length / rowsPerPage) - 1);
  const safePage = Math.min(page, lastPage);

  const columns = [
    { key: 'schedule_date', label: 'Time', render: (a) => formatTime(a.schedule_date) },
    { key: 'pname', label: 'Patient' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'dname', label: 'Doctor' },
  ];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1000, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {!dep ? (
            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
              Your account has no department, so there is no appointment list to show.
            </Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Department:
                </Typography>
                <Chip color="primary" label={dep} sx={{ textTransform: 'capitalize' }} />
                <Typography variant="body2" color="text.secondary">
                  {new Date().toLocaleDateString([], { dateStyle: 'full' })}
                </Typography>
              </Box>

              <DataTable
                columns={columns}
                rows={list.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage)}
                getRowKey={(a) => a._id}
                loading={rows === null}
                emptyMessage="No booked patients for today."
                actionsLabel="Actions"
                fillHeight
                renderActions={(a) => (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                    <Button variant="contained" size="small" onClick={() => setVitalsFor(a)}>
                      Take vitals
                    </Button>
                    <Tooltip title="Cancel appointment">
                      <IconButton color="error" size="small" onClick={() => setToCancel(a)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Mounted only while open so the form starts blank for each patient. */}
      {vitalsFor && <VitalsDialog key={vitalsFor._id} appointment={vitalsFor} onSave={saveVitals} onCancel={() => setVitalsFor(null)} />}

      <ConfirmDialog
        open={toCancel !== null}
        message={`Cancel the appointment of ${toCancel?.pname ?? ''}? The patient will be emailed.`}
        onConfirm={confirmCancel}
        onCancel={() => setToCancel(null)}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
TodaysAppointmentsPage.layout = 'dashboard';
TodaysAppointmentsPage.requiredPermissions = PAGE_ACCESS.receptionAppointments;
