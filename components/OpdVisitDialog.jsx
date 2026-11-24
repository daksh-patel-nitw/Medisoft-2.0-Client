import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { apis } from '../services/commonServices';
import ConfirmDialog from './ConfirmDialog';
import PrescriptionPanel from './PrescriptionPanel';
import { decodeMedicineTimes, formatDate } from '../utils/prescription.util';

// Where a prescribed item stands (MedicineStatus / LabStatus on the server). Only a NOT PAID item can be taken off the visit.
const MEDICINE_STATUS = { P: 'Not paid', B: 'Paid', D: 'Dispensed', C: 'Cancelled' };
const LAB_STATUS = { P: 'Not paid', B: 'Paid', T: 'Sample taken', D: 'Report ready', C: 'Cancelled' };

function ItemRow({ title, chips = [], status, editable, onRemove }) {
  const removable = editable && status.code === 'P';
  return (
    <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight="bold">
          {title}
        </Typography>
        {chips.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {chips.map((c) => (
              <Chip key={c} size="small" label={c} />
            ))}
          </Box>
        )}
      </Box>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Chip size="small" variant="outlined" color={status.code === 'P' ? 'warning' : 'default'} label={status.label} />
        {editable && (
          <Tooltip title={removable ? 'Remove from this visit' : 'Already paid - it can no longer be removed'}>
            <span>
              <IconButton size="small" color="error" disabled={!removable} onClick={onRemove} aria-label={`Remove ${title}`}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

/**
 * One OPD visit of the doctor's: what was prescribed (medicines and tests, with where each stands) and - within
 * 2 days of the visit - taking unpaid items off and adding new ones. After that the visit is read-only.
 *
 *   GET    /doctor/appointments/prescription?id=  -> { pname, editable, editableUntil, medicines[], labs[] }
 *   DELETE /doctor/appointments/prescription      { aid, medicines?: ids, labs?: ids }
 *   POST   /doctor/appointments/prescription      { aid, medicines?, labs?, notes? }   (the shared prescription form)
 *
 * @param {{_id: string, pname: string, schedule_date: string}} appointment
 * @param {() => void} onClose - the dialog asks to be closed (the list re-reads itself)
 */
export default function OpdVisitDialog({ appointment, onClose }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: null, data: null });
  const [toRemove, setToRemove] = useState(null); // { kind: 'medicines' | 'labs', id, name }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = await apis.getRequest('/doctor/appointments/prescription', { id: appointment._id });
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) setResult({ key: reloadKey, data });
    })();
    return () => {
      cancelled = true;
    };
  }, [appointment._id, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const loading = result.key !== reloadKey;
  const data = result.data;

  const confirmRemove = async () => {
    const { kind, id } = toRemove;
    setToRemove(null);
    try {
      await apis.deleteWithBodyRequest('/doctor/appointments/prescription', { aid: appointment._id, [kind]: [id] });
      reload();
    } catch (error) {
      // already toasted (e.g. it was paid in the meantime)
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        {appointment.pname}
        <Typography variant="body2" color="text.secondary">
          Visit of {formatDate(appointment.schedule_date)}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {result.key === null || (loading && !data) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !data ? (
          <Typography color="text.secondary">Could not load this visit.</Typography>
        ) : (
          <Stack spacing={2}>
            {data.editable ? (
              <Alert severity="info">You can change this visit until {formatDate(data.editableUntil)}. Only items that have not been paid for can be removed.</Alert>
            ) : (
              <Alert severity="warning">
                {data.editableUntil ? `This visit can no longer be changed (the 2 days ended ${formatDate(data.editableUntil)}).` : 'This visit has not been completed, so there is nothing to change yet.'}
              </Alert>
            )}

            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Medicines
              </Typography>
              {data.medicines.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  None.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {data.medicines.map((m) => (
                    <ItemRow
                      key={m._id}
                      title={m.mname}
                      chips={decodeMedicineTimes(m.time)}
                      status={{ code: m.status, label: MEDICINE_STATUS[m.status] ?? m.status }}
                      editable={data.editable}
                      onRemove={() => setToRemove({ kind: 'medicines', id: m._id, name: m.mname })}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Lab tests
              </Typography>
              {data.labs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  None.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {data.labs.map((l) => (
                    <ItemRow
                      key={l._id}
                      title={l.tname}
                      status={{ code: l.status, label: LAB_STATUS[l.status] ?? l.status }}
                      editable={data.editable}
                      onRemove={() => setToRemove({ kind: 'labs', id: l._id, name: l.tname })}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            {data.editable && (
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Add to this visit
                </Typography>
                {/* keyed so the form starts blank after every save */}
                <PrescriptionPanel
                  key={reloadKey}
                  aid={appointment._id}
                  endpoint="/doctor/appointments/prescription"
                  notesLabel="Add a note (optional)"
                  submitLabel="Add to this visit"
                  onDone={reload}
                />
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <ConfirmDialog
        open={toRemove !== null}
        message={`Remove ${toRemove?.name ?? 'this item'} from the visit?`}
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
      />
    </Dialog>
  );
}
