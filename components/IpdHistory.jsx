import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { apis } from '../services/commonServices';
import { decodeMedicineTimes } from '../utils/prescription.util';

// YYYY-MM-DD in the user's own time zone: one key per calendar day
const dayKey = (value) => (value ? new Date(value).toLocaleDateString('en-CA') : 'earlier');
const dayLabel = (key, sample) => (key === 'earlier' ? 'Earlier' : new Date(sample).toLocaleDateString([], { dateStyle: 'full' }));
const timeLabel = (value) => (value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

/**
 * Everything done for one inpatient stay, day by day (newest day first): each day has its own heading and a
 * rule, then the medicines, the lab tests and the doctors' notes of that day. Reads
 * GET /doctor/getPatAppHistory?id=<aid> when it mounts (and again whenever `reloadKey` changes).
 *
 *   -> { medicines: [{ mname, quantity, time, createdAt }], labtests: [{ tname, status, createdAt }],
 *        patient: { notes: [{ text, dname, at }] } }
 */
export default function IpdHistory({ aid, reloadKey = 0 }) {
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

  const days = useMemo(() => {
    const { medicines = [], labtests = [], patient } = state.data ?? {};
    // a note saved before notes became a list is a plain string
    const notes = Array.isArray(patient?.notes) ? patient.notes : patient?.notes ? [{ text: patient.notes, at: null }] : [];
    const byDay = new Map();
    const bucket = (value) => {
      const key = dayKey(value);
      if (!byDay.has(key)) byDay.set(key, { key, sample: value, medicines: [], labs: [], notes: [] });
      return byDay.get(key);
    };
    medicines.forEach((m) => bucket(m.createdAt).medicines.push(m));
    labtests.forEach((l) => bucket(l.createdAt).labs.push(l));
    notes.forEach((n) => bucket(n.at).notes.push(n));
    return [...byDay.values()].sort((a, b) => (a.key === 'earlier' ? 1 : b.key === 'earlier' ? -1 : b.key.localeCompare(a.key)));
  }, [state.data]);

  if (state.key !== requestKey) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }
  if (!state.data) return <Typography color="text.secondary">Could not load the history.</Typography>;
  if (days.length === 0) return <Typography color="text.secondary">Nothing has been prescribed or noted for this stay yet.</Typography>;

  return (
    <Stack spacing={2.5}>
      {days.map((day) => (
        <Box key={day.key}>
          <Typography variant="subtitle1" fontWeight="bold">
            {dayLabel(day.key, day.sample)}
          </Typography>
          <Divider sx={{ mb: 1.25, borderBottomWidth: 2 }} />

          {day.medicines.length > 0 && (
            <Box sx={{ mb: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                MEDICINES
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {day.medicines.map((m, i) => (
                  <Box key={m._id ?? i} sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {m.mname}
                      {m.createdAt ? <span style={{ fontWeight: 400, color: '#777' }}> · {timeLabel(m.createdAt)}</span> : null}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {decodeMedicineTimes(m.time).map((t) => (
                        <Chip key={t} size="small" label={t} />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {day.labs.length > 0 && (
            <Box sx={{ mb: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                LAB TESTS
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                {day.labs.map((l, i) => (
                  <Chip key={l._id ?? i} size="small" color="secondary" variant="outlined" label={l.tname} />
                ))}
              </Box>
            </Box>
          )}

          {day.notes.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                DOCTOR NOTES
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {day.notes.map((n, i) => (
                  <Box key={i} sx={{ p: 1, borderRadius: 1, border: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      {[n.dname ? `Dr. ${n.dname}` : null, timeLabel(n.at)].filter(Boolean).join(' · ')}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {n.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}
