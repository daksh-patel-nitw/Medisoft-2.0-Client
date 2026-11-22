import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import { toast } from 'react-toastify';
import { apis } from '../../services/commonServices';
import { PAGE_ACCESS } from '../../utils/pageAccess';

const SECTIONS = [
  { title: 'Doctor consultation', kinds: ['doctor'] },
  { title: 'Medicines', kinds: ['medicine'] },
  { title: 'Lab tests', kinds: ['lab'] },
  { title: 'Room & inpatient doctor', kinds: ['room', 'ipdDoctor'] },
];

const rupees = (value) => `₹${Number(value).toFixed(2)}`;

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

export default function PatientBillsPage({ currentUser }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [bill, setBill] = useState(null); // null = loading; { lines, total }
  const [paying, setPaying] = useState(false);
  // A payment id Razorpay gave us that the server hasn't confirmed yet (e.g. the connection dropped): kept so it can be retried.
  const [unconfirmedPaymentId, setUnconfirmedPaymentId] = useState(null);

  // GET /payment/pending -> { lines: [{ kind, id?, aid, name, price }], total }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apis.getRequest('/payment/pending');
        if (!cancelled) setBill(data ?? { lines: [], total: 0 });
      } catch (error) {
        if (!cancelled) setBill((prev) => prev ?? { lines: [], total: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  // Only the payment id goes to the server; it asks Razorpay what was paid and marks the right charges itself.
  const confirm = useCallback(async (paymentId) => {
    try {
      await apis.postRequest('/payment/verify', { paymentId });
      setUnconfirmedPaymentId(null);
    } catch (error) {
      setUnconfirmedPaymentId(paymentId);
    } finally {
      setReloadKey((k) => k + 1);
    }
  }, []);

  const pay = async () => {
    setPaying(true);
    try {
      if (!(await loadCheckout())) {
        toast.error('Could not load the payment window. Check your connection and try again.');
        return;
      }
      // The amount is decided by the server from what is actually owed - nothing is sent.
      const order = await apis.postRequest('/payment/order');
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
      return; // stays "paying" until the window is dismissed or the payment is confirmed
    } catch (error) {
      // already toasted by the http client
    }
    setPaying(false);
  };

  if (bill === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Pending bills
          </Typography>

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
              {SECTIONS.map(({ title, kinds }) => {
                const lines = bill.lines.filter((l) => kinds.includes(l.kind));
                if (lines.length === 0) return null;
                return (
                  <Box key={title} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {title}
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {lines.map((l) => (
                          <TableRow key={`${l.kind}-${l.id ?? l.aid}`}>
                            <TableCell sx={{ pl: 0 }}>{l.name}</TableCell>
                            <TableCell align="right" sx={{ pr: 0 }}>
                              {rupees(l.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                );
              })}
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6">{rupees(bill.total)}</Typography>
              </Stack>
              <Button fullWidth variant="contained" size="large" startIcon={<PaymentIcon />} sx={{ mt: 2 }} onClick={pay} disabled={paying || bill.total <= 0}>
                {paying ? 'Waiting for payment...' : `Pay ${rupees(bill.total)}`}
              </Button>
              <Button fullWidth size="small" sx={{ mt: 1 }} onClick={reload}>
                Refresh
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
PatientBillsPage.layout = 'dashboard';
PatientBillsPage.requiredPermissions = PAGE_ACCESS.patientBills;
