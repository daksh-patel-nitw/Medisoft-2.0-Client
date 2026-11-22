import React, { useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { apis } from '../services/commonServices';
import { decodeMedicineTimes } from '../utils/prescription.util';

/**
 * What was prescribed in one appointment: vitals, notes, medicines (with the
 * times to take them) and lab tests. Reads GET /doctor/getPatAppHistory?id=<aid>
 * when it mounts, so wrap it in something that mounts it lazily (e.g. an
 * Accordion with unmountOnExit) and the data is fetched only when it is opened.
 *
 *   -> { medicines: [{ mname, quantity, time }], labtests: [{ tname }],
 *        patient: { weight, height, notes, selected_doctor_qs } }
 */
export default function AppointmentDetails({ aid, reloadKey = 0 }) {
  const [state, setState] = useState({ key: null, data: null });
  const requestKey = `${aid}|${reloadKey}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        data = await apis.getRequest('/doctor/getPatAppHistory', { id: aid });
      } catch (error) {
        // already toasted by the http client
      }
      if (!cancelled) setState({ key: requestKey, data });
    })();
    return () => {
      cancelled = true;
    };
  }, [aid, requestKey]);

  if (state.key !== requestKey) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (!state.data) return <Typography color="text.secondary">Could not load this appointment.</Typography>;

  const { medicines = [], labtests = [], patient } = state.data;

  return (
    <Stack spacing={1.5}>
      {patient && (patient.weight || patient.height) && (
        <Typography variant="body2" color="text.secondary">
          {patient.height ? `Height ${patient.height} cm` : ''}
          {patient.height && patient.weight ? ' · ' : ''}
          {patient.weight ? `Weight ${patient.weight} kg` : ''}
        </Typography>
      )}

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Medicines
        </Typography>
        {medicines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {medicines.map((m, i) => (
              <Box key={m._id ?? i} sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2" fontWeight="bold">
                  {m.mname}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {decodeMedicineTimes(m.time).map((t) => (
                    <Chip key={t} size="small" label={t} />
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Lab tests
        </Typography>
        {labtests.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {labtests.map((t, i) => (
              <Chip key={t._id ?? i} size="small" color="secondary" variant="outlined" label={t.tname} />
            ))}
          </Box>
        )}
      </Box>

      {patient?.notes && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Notes
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {patient.notes}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
