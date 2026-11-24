import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Box, Button, Typography, Checkbox } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apis } from '../../services/commonServices';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable from '../../components/DataTable';
import PatientFinder from '../../components/PatientFinder';
import CardActionButton from '../../components/CardActionButton';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// The API stores a medicine's dosage time as a short code (MedicineTimeToDB on the server).
const TIME_LABELS = {
  BB: 'Before breakfast',
  AB: 'After breakfast',
  BL: 'Before lunch',
  AL: 'After lunch',
  S: 'Noon snacks',
  O: 'Once in a day',
  BD: 'Before dinner',
  AD: 'After dinner',
  BS: 'Before sleep',
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString([], { dateStyle: 'medium' }) : '-');

// ==========================================
// STEP 2: the patient's paid medicines - tick what to hand over, then dispense
// ==========================================
function DispenseStep({ patient, onBack }) {
  const [rows, setRows] = useState(null); // null = still loading
  const [selected, setSelected] = useState(() => new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const [confirming, setConfirming] = useState(false);

  // GET /pharmacy/prescription?pid= returns the patient's paid medicines
  // GROUPED BY APPOINTMENT: [{ aid, did, dname, schedule_date, items: [...] }].
  // They are flattened into one table; every row keeps its visit's `aid`
  // (needed to dispense) plus the doctor and date to show.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const groups = await apis.getRequest('/pharmacy/prescription', { pid: patient.pid });
        const flat = (groups || []).flatMap((g) =>
          g.items.map((item) => ({ ...item, aid: g.aid, dname: g.dname, schedule_date: g.schedule_date }))
        );
        if (!cancelled) {
          setRows(flat);
          setSelected(new Set(flat.map((r) => r._id))); // everything ticked to start with
        }
      } catch (error) {
        if (!cancelled) setRows([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patient.pid, reloadKey]);

  const list = rows ?? [];
  const allSelected = list.length > 0 && selected.size === list.length;

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(list.map((r) => r._id)));

  const columns = useMemo(
    () => [
      {
        key: 'sel',
        minWidth: 48,
        label: (
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={selected.size > 0 && !allSelected}
            onChange={toggleAll}
            sx={{ color: 'inherit', p: 0.5, '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: 'inherit' } }}
            slotProps={{ input: { 'aria-label': 'Select all medicines' } }}
          />
        ),
        render: (r) => <Checkbox size="small" checked={selected.has(r._id)} onChange={() => toggleOne(r._id)} sx={{ p: 0.5 }} />,
      },
      { key: 'mname', label: 'Medicine' },
      { key: 'quantity', label: 'Quantity (units; packs for pack-only medicines)', align: 'right' },
      { key: 'time', label: 'When to take', render: (r) => TIME_LABELS[r.time] ?? r.time },
      { key: 'dname', label: 'Doctor' },
      { key: 'schedule_date', label: 'Visit date', render: (r) => formatDate(r.schedule_date) },
    ],
    // toggleOne / toggleAll only use setSelected and the current list
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, list]
  );

  const dispense = async () => {
    setConfirming(false);
    // One appointment at a time: the sell call takes the appointment id in the
    // query and that appointment's prescription ids in the body.
    const idsByAid = new Map();
    for (const r of list) {
      if (!selected.has(r._id)) continue;
      idsByAid.set(r.aid, [...(idsByAid.get(r.aid) ?? []), r._id]);
    }
    try {
      for (const [aid, ids] of idsByAid) {
        await apis.putRequest(`/pharmacy/prescription?id=${encodeURIComponent(aid)}`, { ids });
      }
    } catch (error) {
      // e.g. "Insufficient medicine stock." - already toasted by the http client.
    } finally {
      // Re-read either way: whatever was handed over before a failure is gone from the list.
      setReloadKey((k) => k + 1);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

      <DataTable
        columns={columns}
        rows={list}
        getRowKey={(r) => r._id}
        loading={rows === null}
        emptyMessage="No paid medicines are waiting for this patient."
        fillHeight
      />

      <CardActionButton onClick={() => setConfirming(true)} disabled={selected.size === 0}>
        Dispense medicines{selected.size > 0 ? ` (${selected.size})` : ''}
      </CardActionButton>

      <ConfirmDialog
        open={confirming}
        message={`Hand over ${selected.size} medicine(s) to ${patient.pname}? Stock will be reduced.`}
        onConfirm={dispense}
        onCancel={() => setConfirming(false)}
      />
    </Box>
  );
}

// ==========================================
// MAIN PAGE COMPONENT: step 1 find the patient -> Next -> step 2 dispense
// ==========================================
export default function PharmacyBillingPage() {
  const [patient, setPatient] = useState(null);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1000, boxShadow: 3, height: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {patient ? (
            <DispenseStep patient={patient} onBack={() => setPatient(null)} />
          ) : (
            <PatientFinder onNext={setPatient} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
PharmacyBillingPage.layout = 'dashboard';
PharmacyBillingPage.requiredPermissions = PAGE_ACCESS.pharmacyDispense;
