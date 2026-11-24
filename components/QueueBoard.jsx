import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { apis } from '../services/commonServices';

// Appointment status codes the queue returns (AppointmentStatus on the server).
const WITH_DOCTOR = 'D'; // the patient currently being seen
// anything else (status 'I') is waiting

const NAVY = '#0f2a4a';
const ACCENT = '#1976d2';
const SERVING = '#12a36b';

/**
 * The waiting-room board for one department: one card per doctor showing who is being seen now and who is
 * waiting, in order. Shows patient NAMES only. Refreshes itself, and can be shown full screen (for a
 * waiting-room TV) with the button in the header.
 *
 *   GET /reception/queueScreen?dep=  ->  [{ _id: doctorId, doctorName, appointments: [{ pid, pname, status }] }]
 *
 * @param {string} dep - the department to show
 * @param {number} [refreshMs] - how often to re-read the queue
 */
export default function QueueBoard({ dep, refreshMs = 10000 }) {
  const rootRef = useRef(null);
  const [doctors, setDoctors] = useState(null); // null = first load not done
  const [now, setNow] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  // the queue, re-read on a timer
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest('/reception/queueScreen', { dep });
        if (!cancelled) setDoctors(data || []);
      } catch (error) {
        if (!cancelled) setDoctors((prev) => prev ?? []); // keep the last good board if a refresh fails
      }
    };
    load();
    const timer = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [dep, refreshMs]);

  // the clock in the header
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  // full screen: follows the browser's own state too (Esc leaves it)
  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    const enable = setTimeout(() => setCanFullscreen(Boolean(document.fullscreenEnabled)), 0);
    document.addEventListener('fullscreenchange', sync);
    return () => {
      clearTimeout(enable);
      document.removeEventListener('fullscreenchange', sync);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch (error) {
      // the browser refused (e.g. not allowed in this context): stay as we are
    }
  }, []);

  // bigger type when the board fills a TV
  const scale = isFullscreen ? 1.35 : 1;

  return (
    <Box
      ref={rootRef}
      sx={{
        backgroundColor: '#eef2f7',
        height: '100%',
        minHeight: 480,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isFullscreen ? 0 : 1,
        overflow: 'hidden',
        boxShadow: isFullscreen ? 0 : 3,
      }}
    >
      {/* header */}
      <Box
        sx={{
          background: `linear-gradient(90deg, ${NAVY} 0%, #17406f 100%)`,
          color: '#fff',
          px: { xs: 2, md: 4 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <LocalHospitalIcon sx={{ fontSize: 44 * scale, color: '#7fc4ff' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800} noWrap sx={{ fontSize: { xs: 22, md: 30 * scale }, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.1 }}>
              {dep || 'Department'}
            </Typography>
            <Typography sx={{ fontSize: 14 * scale, opacity: 0.8, letterSpacing: 2 }}>PATIENT QUEUE · MEDISOFT HMS</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {now && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography fontWeight={700} sx={{ fontSize: 30 * scale, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              <Typography sx={{ fontSize: 13 * scale, opacity: 0.8 }}>{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</Typography>
            </Box>
          )}
          {canFullscreen && (
            <Tooltip title={isFullscreen ? 'Exit full screen' : 'Full screen'}>
              <IconButton onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'} sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* the doctors */}
      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: { xs: 2, md: 3 } }}>
        {doctors === null ? (
          <Typography variant="h5" align="center" color="text.secondary" mt={8}>
            Loading queue...
          </Typography>
        ) : doctors.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10, color: 'text.secondary' }}>
            <MedicalServicesIcon sx={{ fontSize: 72 * scale, opacity: 0.35 }} />
            <Typography variant="h4" sx={{ fontSize: 32 * scale, mt: 1 }}>
              No patients in the queue
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(300px, 1fr))' }, alignItems: 'stretch' }}>
            {doctors.map((doctor) => {
              const appointments = doctor.appointments ?? [];
              const serving = appointments.filter((p) => p.status === WITH_DOCTOR);
              const waiting = appointments.filter((p) => p.status !== WITH_DOCTOR); // in the order the server sent them
              return (
                <Paper key={doctor._id} elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ backgroundColor: NAVY, color: '#fff', px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Typography fontWeight={700} noWrap sx={{ fontSize: 22 * scale }}>
                      Dr. {doctor.doctorName}
                    </Typography>
                    <Chip size="small" label={`${waiting.length} waiting`} sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600, fontSize: 13 * scale }} />
                  </Box>

                  <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                    {/* now serving */}
                    <Box>
                      <Typography sx={{ fontSize: 12 * scale, fontWeight: 700, letterSpacing: 2, color: SERVING, mb: 0.75 }}>NOW SERVING</Typography>
                      {serving.length === 0 ? (
                        <Typography color="text.secondary" sx={{ fontSize: 18 * scale, py: 1.5 }}>
                          -
                        </Typography>
                      ) : (
                        serving.map((p) => (
                          <Box
                            key={p.pid}
                            sx={{
                              backgroundColor: SERVING,
                              color: '#fff',
                              borderRadius: 1.5,
                              px: 2.5,
                              py: 2,
                              boxShadow: '0 4px 14px rgba(18, 163, 107, 0.35)',
                              mb: 1,
                            }}
                          >
                            <Typography fontWeight={800} sx={{ fontSize: 30 * scale, lineHeight: 1.15, wordBreak: 'break-word' }}>
                              {p.pname}
                            </Typography>
                          </Box>
                        ))
                      )}
                    </Box>

                    {/* waiting, in order */}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography sx={{ fontSize: 12 * scale, fontWeight: 700, letterSpacing: 2, color: 'text.secondary', mb: 0.75 }}>NEXT IN LINE</Typography>
                      {waiting.length === 0 ? (
                        <Typography color="text.secondary" sx={{ fontSize: 16 * scale }}>
                          No waiting patients
                        </Typography>
                      ) : (
                        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {waiting.map((p, index) => (
                            <Box
                              component="li"
                              key={p.pid}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1.75, borderRadius: 1.5, border: '1px solid #dbe3ee', backgroundColor: '#f7f9fc', px: 1.5, py: 1.1 }}
                            >
                              <Box
                                sx={{
                                  width: 34 * scale,
                                  height: 34 * scale,
                                  borderRadius: '50%',
                                  backgroundColor: index === 0 ? ACCENT : '#cfd9e6',
                                  color: index === 0 ? '#fff' : NAVY,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: 16 * scale,
                                  flexShrink: 0,
                                }}
                              >
                                {index + 1}
                              </Box>
                              <Typography fontWeight={index === 0 ? 700 : 500} sx={{ fontSize: 20 * scale, wordBreak: 'break-word' }}>
                                {p.pname}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
