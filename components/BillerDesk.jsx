import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Divider, Skeleton, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PatientFinder from './PatientFinder';
import ConfirmDialog from './ConfirmDialog';
import CardActionButton from './CardActionButton';
import { apis } from '../services/commonServices';
import { formatDate } from '../utils/prescription.util';

// The four slices of a patient's pending bills the API knows (see Bill_Role on the server):
//   ba - OPD doctor consultation, bm - medicines, bl - lab tests, bi - IPD (room stays + inpatient doctor)
export const ALL_BILL_SLICES = ['ba', 'bm', 'bl', 'bi'];

const rupees = (value) => `₹${Number(value || 0).toFixed(2)}`;

/**
 * Turns the API's { <aid>: { dname, doctor_price, medicines[], lab[], room[] } } into one card per
 * appointment, keeping only the slices this desk handles, plus the ids that "mark paid" will send.
 * The server already limits what it returns to the caller's permissions; `slices` narrows it further
 * so e.g. the pharmacy desk shows medicines only.
 */
function buildBill(data, slices) {
  const has = (slice) => slices.includes(slice);
  const groups = [];
  const ids = { aids: [], medicines: [], lab: [], room: [] };

  for (const [aid, b] of Object.entries(data || {})) {
    const lines = [];
    const isIpd = Array.isArray(b.room) && b.room.length > 0;

    // OPD: a flat consultation fee, settled through the appointment itself. IPD: the doctor's per-day
    // fee x days - derived from the room stay, so it is settled by billing the room (no id of its own).
    if (b.doctor_price != null && (isIpd ? has('bi') : has('ba'))) {
      lines.push({ key: `d-${aid}`, label: isIpd ? 'Inpatient doctor charge' : 'Consultation', price: Number(b.doctor_price) });
      if (!isIpd) ids.aids.push(aid);
    }
    if (has('bm')) {
      for (const m of b.medicines ?? []) {
        lines.push({ key: `m-${m._id}`, label: m.mname, note: formatDate(m.createdAt), price: Number(m.price) });
        ids.medicines.push(String(m._id));
      }
    }
    if (has('bl')) {
      for (const l of b.lab ?? []) {
        lines.push({ key: `l-${l._id}`, label: l.tname, note: formatDate(l.createdAt), price: Number(l.price) });
        ids.lab.push(String(l._id));
      }
    }
    if (has('bi')) {
      for (const r of b.room ?? []) {
        lines.push({
          key: `r-${r.id}`,
          label: `Room ${r.rn ?? ''}${r.rc ? ` (${r.rc})` : ''}`,
          note: `${r.total_billed_days} day${r.total_billed_days === 1 ? '' : 's'} × ${rupees(r.price_per_day)}${r.discharged_at ? ` · discharged ${formatDate(r.discharged_at)}` : ''}`,
          price: Number(r.total_price),
        });
        ids.room.push(String(r.id));
      }
    }

    if (lines.length > 0) {
      groups.push({ aid, dname: b.dname, lines, subtotal: lines.reduce((sum, l) => sum + l.price, 0) });
    }
  }

  const total = groups.reduce((sum, g) => sum + g.subtotal, 0);
  return { groups, total, ids };
}

/** One patient's pending bills with a "Paid" button (step 2 of the desk). */
function PatientBills({ patient, slices, onBack }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, data: null });
  const [confirming, setConfirming] = useState(false);
  const key = `${patient.pid}|${reloadKey}`;

  // POST /payment/bills/pending { pid } -> pending bills grouped by appointment, limited to this user's billing permissions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = await apis.postReadRequest('/payment/bills/pending', { pid: patient.pid });
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) setResult({ key, data: data ?? {} });
    })();
    return () => {
      cancelled = true;
    };
  }, [patient.pid, key]);

  const loading = result.key !== key;
  const bill = useMemo(() => buildBill(result.data, slices), [result.data, slices]);

  // PUT /payment/bills { pid, aids?, medicines?, lab?, room? } - only the ids shown here are sent; the server
  // applies just the kinds this user's permissions cover.
  const markPaid = async () => {
    setConfirming(false);
    const body = { pid: patient.pid };
    for (const [list, ids] of Object.entries(bill.ids)) {
      if (ids.length > 0) body[list] = ids;
    }
    try {
      await apis.putRequest('/payment/bills', body);
      setReloadKey((k) => k + 1);
    } catch (error) {
      // already toasted by the http client; the bill stays so it can be retried
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {patient.pname}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {patient.pid} · {patient.mobile}
          </Typography>
        </Box>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Change patient
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
        {loading ? (
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
        ) : bill.groups.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            Nothing pending for this patient.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {bill.groups.map((g) => (
              <Card key={g.aid} variant="outlined">
                <CardContent sx={{ pb: '12px !important' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {g.dname ? `Dr. ${g.dname}` : 'Appointment'}
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      {g.lines.map((l) => (
                        <TableRow key={l.key}>
                          <TableCell sx={{ pl: 0 }}>
                            <Typography variant="body2">{l.label}</Typography>
                            {l.note && (
                              <Typography variant="caption" color="text.secondary">
                                {l.note}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 0 }}>
                            {rupees(l.price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Subtotal
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {rupees(g.subtotal)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Total to collect</Typography>
              <Typography variant="h6">{rupees(bill.total)}</Typography>
            </Stack>
          </Stack>
        )}
      </Box>

      {!loading && bill.groups.length > 0 && (
        <CardActionButton color="success" onClick={() => setConfirming(true)}>
          Paid - mark as billed
        </CardActionButton>
      )}

      <ConfirmDialog
        open={confirming}
        message={`Confirm that ${patient.pname} has paid ${rupees(bill.total)}? These charges will be marked as billed.`}
        onConfirm={markPaid}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/**
 * The shared biller desk used by every billing page (Billing, Pharmacy, Laboratory, Room, Reception):
 * find the patient with the shared three-box finder, read their pending bills from
 * POST /payment/bills/pending, and once they have paid press "Paid" to call PUT /payment/bills.
 *
 * What a user sees and can mark billed is limited by their own billing permissions on the server
 * (doctor / medicines / lab / IPD); `slices` narrows the view further for a department's page.
 *
 * @param {string} [title]
 * @param {Array<'ba'|'bm'|'bl'|'bi'>} [slices] - which bill types this page deals with (default: all four)
 */
export default function BillerDesk({ title = 'Patient bills', slices = ALL_BILL_SLICES }) {
  const [patient, setPatient] = useState(null);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {patient ? (
            <PatientBills patient={patient} slices={slices} onBack={() => setPatient(null)} />
          ) : (
            <>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                {title}
              </Typography>
              <PatientFinder onNext={setPatient} />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
