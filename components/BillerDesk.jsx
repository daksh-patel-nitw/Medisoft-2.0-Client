import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Divider, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PatientFinder from './PatientFinder';
import ConfirmDialog from './ConfirmDialog';
import CardActionButton from './CardActionButton';
import BillTable from './BillTable';
import { apis } from '../services/commonServices';
import { linesFromBuckets, rupees, useBillSelection } from '../utils/billing.util';

// The four slices of a patient's pending bills the API knows (see Bill_Role on the server):
//   ba - OPD doctor consultation, bm - medicines, bl - lab tests, bi - IPD (room stays + inpatient doctor)
export const ALL_BILL_SLICES = ['ba', 'bm', 'bl', 'bi'];

/** One patient's pending bills as tables with checkboxes and a "Paid" button (step 2 of the desk). */
function PatientBills({ patient, slices, onBack, onPaid }) {
  const [result, setResult] = useState({ pid: null, data: null });

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
      if (!cancelled) setResult({ pid: patient.pid, data: data ?? {} });
    })();
    return () => {
      cancelled = true;
    };
  }, [patient.pid]);

  const loading = result.pid !== patient.pid;
  const lines = useMemo(() => linesFromBuckets(result.data, slices), [result.data, slices]);
  const { selected, setSelected, total, payload, count } = useBillSelection(lines);
  const [confirming, setConfirming] = useState(false);

  // PUT /payment/bills { pid, aids?, medicines?, lab?, room? } - ONLY the ticked items are sent; the server applies
  // just the kinds this user's permissions cover. When it is done the desk goes back to the patient search.
  const markPaid = async () => {
    setConfirming(false);
    try {
      await apis.putRequest('/payment/bills', { pid: patient.pid, ...payload });
      onPaid();
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
        ) : lines.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            Nothing pending for this patient.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <BillTable lines={lines} selected={selected} onChange={setSelected} />
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Total to collect</Typography>
              <Typography variant="h6">{rupees(total)}</Typography>
            </Stack>
          </Stack>
        )}
      </Box>

      {!loading && lines.length > 0 && (
        <CardActionButton color="success" onClick={() => setConfirming(true)} disabled={count === 0}>
          {count === 0 ? 'Select the items that were paid' : `Paid ${rupees(total)} - mark as billed`}
        </CardActionButton>
      )}

      <ConfirmDialog
        open={confirming}
        message={`Confirm that ${patient.pname} has paid ${rupees(total)}? The ${count} selected item${count === 1 ? '' : 's'} will be marked as billed.`}
        onConfirm={markPaid}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/**
 * The shared biller desk used by every billing page (Billing, Pharmacy, Laboratory, Room, Reception):
 * find the patient with the shared three-box finder, read their pending bills from
 * POST /payment/bills/pending, tick the items the patient is paying, and press "Paid" to call
 * PUT /payment/bills with just those items. Afterwards the desk clears the patient and shows the search again.
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
      <Card sx={{ width: '100%', maxWidth: 900, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {patient ? (
            <PatientBills patient={patient} slices={slices} onBack={() => setPatient(null)} onPaid={() => setPatient(null)} />
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
