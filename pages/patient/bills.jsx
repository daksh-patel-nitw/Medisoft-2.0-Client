import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import { toast } from 'react-toastify';
import BillTable from '../../components/BillTable';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { PAGE_ACCESS } from '../../utils/pageAccess';
import { rupees, useBillSelection } from '../../utils/billing.util';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// Loads Razorpay Checkout once; resolves false when the script can't be reached.
function loadCheckout() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** The patient's pending bill: tick what to pay now, pay it online. */
function BillView({ bill, currentUser, onPaid }) {
  const { selected, setSelected, total, payload, count } = useBillSelection(bill.lines);
  const [paying, setPaying] = useState(false);
  // A payment id Razorpay gave us that the server hasn't confirmed yet (e.g. the connection dropped): kept so it can be retried.
  const [unconfirmedPaymentId, setUnconfirmedPaymentId] = useState(null);

  // Only the payment id goes to the server; it asks Razorpay what was paid and marks the right charges itself.
  const confirm = useCallback(
    async (paymentId) => {
      try {
        await apis.postRequest('/payment/verify', { paymentId });
        setUnconfirmedPaymentId(null);
      } catch (error) {
        setUnconfirmedPaymentId(paymentId);
      } finally {
        onPaid();
      }
    },
    [onPaid],
  );

  const pay = async () => {
    setPaying(true);
    try {
      if (!(await loadCheckout())) {
        toast.error('Could not load the payment window. Check your connection and try again.');
        setPaying(false);
        return;
      }
      // Only the ids of the ticked items are sent; the amount is decided by the server from exactly those.
      const order = await apis.postRequest('/payment/order', payload);
      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Medisoft',
        description: 'Hospital bill',
        prefill: { name: currentUser?.name },
        handler: async (response) => {
          await confirm(response.razorpay_payment_id);
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      checkout.on('payment.failed', (response) => toast.error(response?.error?.description || 'Payment failed.'));
      checkout.open();
    } catch (error) {
      // already toasted by the http client
      setPaying(false);
    }
  };

  return (
    <>
      {unconfirmedPaymentId && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => confirm(unconfirmedPaymentId)}>
              Retry
            </Button>
          }
        >
          Your payment went through but we could not confirm it yet. Do not pay again - retry the confirmation.
        </Alert>
      )}

      {bill.lines.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          You have nothing to pay.
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Tick the items you want to pay now.
          </Typography>
          <BillTable lines={bill.lines} selected={selected} onChange={setSelected} />
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Total to pay</Typography>
            <Typography variant="h6">{rupees(total)}</Typography>
          </Stack>
          <Button fullWidth variant="contained" size="large" startIcon={<PaymentIcon />} sx={{ mt: 2 }} onClick={pay} disabled={paying || count === 0}>
            {paying ? 'Waiting for payment...' : count === 0 ? 'Select the items to pay' : `Pay ${rupees(total)}`}
          </Button>
          <Button fullWidth size="small" sx={{ mt: 1 }} onClick={onPaid}>
            Refresh
          </Button>
        </>
      )}
    </>
  );
}

export default function PatientBillsPage({ currentUser }) {
  const [reloadKey, setReloadKey] = useState(0);
  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);
  const readKey = `${reloadKey}|${refreshTick}`;
  const [result, setResult] = useState({ key: null, bill: null }); // key = which read the bill is from

  // GET /payment/pending -> { lines: [{ kind, id?, roomId?, aid, dname, name, units?, unitPrice?, price }], total }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = (await apis.getRequest('/payment/pending')) ?? { lines: [], total: 0 };
      } catch (error) {
        // already toasted by the http client; keep the last good bill
      }
      if (!cancelled) setResult((prev) => ({ key: readKey, bill: data ?? prev.bill ?? { lines: [], total: 0 } }));
      finishRefresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [readKey, finishRefresh]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  if (result.key === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 900, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Pending bills
          </Typography>
          {/* keyed so the ticks start fresh (everything ticked) every time the bill is re-read */}
          <BillView key={result.key} bill={result.bill} currentUser={currentUser} onPaid={reload} />
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
PatientBillsPage.layout = 'dashboard';
PatientBillsPage.requiredPermissions = PAGE_ACCESS.patientBills;
