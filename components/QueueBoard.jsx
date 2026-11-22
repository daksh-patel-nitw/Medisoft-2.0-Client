import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import { Box, Typography, Paper } from '@mui/material';
import { apis } from '../services/commonServices';

// Appointment status codes the queue returns (AppointmentStatus on the server).
const WITH_DOCTOR = 'D'; // the patient currently being seen
// anything else (status 'I') is waiting

/**
 * The waiting-room board for one department: one column per doctor, the
 * patient being seen highlighted, the others waiting below. Refreshes itself.
 *
 *   GET /reception/queueScreen?dep=  ->  [{ _id: doctorId, doctorName, appointments: [{ pid, pname, status }] }]
 *
 * @param {string} dep - the department to show
 * @param {number} [refreshMs] - how often to re-read the queue
 */
export default function QueueBoard({ dep, refreshMs = 10000 }) {
  const [doctors, setDoctors] = useState(null); // null = first load not done

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

  return (
    <Box
      sx={{
        backgroundColor: '#f7f5b5', // light yellow waiting-room feel
        height: '100%',
        minHeight: 480,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1,
        overflow: 'hidden',
        boxShadow: 3,
      }}
    >
      {/* scrolling ticker */}
      <Box sx={{ backgroundColor: '#673AB7', color: 'white', py: 1.5, overflow: 'hidden', whiteSpace: 'nowrap', boxShadow: 3, zIndex: 1 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{
            display: 'inline-block',
            animation: 'marquee 15s linear infinite',
            '@keyframes marquee': {
              '0%': { transform: 'translateX(100vw)' },
              '100%': { transform: 'translateX(-100%)' },
            },
          }}
        >
          {dep ? dep.toUpperCase() : ''} DEPARTMENT &emsp;&emsp; | &emsp;&emsp; MEDISOFT HMS SYSTEM
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', p: 3 }}>
        {doctors === null ? (
          <Typography variant="h4" align="center" mt={6}>
            Loading queue...
          </Typography>
        ) : doctors.length === 0 ? (
          <Typography variant="h4" align="center" mt={6}>
            No patients in the queue
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {doctors.map((doctor) => {
              // the patient with the doctor first, then the waiting ones in the order the server sent them
              const patients = [...(doctor.appointments ?? [])].sort(
                (a, b) => Number(b.status === WITH_DOCTOR) - Number(a.status === WITH_DOCTOR)
              );
              return (
                <Grid size="grow" key={doctor._id} sx={{ minWidth: 280 }}>
                  <Paper elevation={4} sx={{ p: 2, height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.85)', borderTop: '8px solid #673AB7' }}>
                    <Typography variant="h5" align="center" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                      Dr. {doctor.doctorName}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {patients.map((p) => {
                        const isCurrent = p.status === WITH_DOCTOR;
                        return (
                          <Box
                            key={p.pid}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              // bright for the patient being seen, dark for those waiting
                              backgroundColor: isCurrent ? '#00FFCA' : '#393646',
                              color: isCurrent ? '#000' : '#fff',
                              boxShadow: isCurrent ? '0px 0px 15px rgba(0, 255, 202, 0.6)' : 1,
                              transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Typography variant={isCurrent ? 'h5' : 'h6'} fontWeight="bold">
                              {p.pname}
                            </Typography>
                            <Typography variant={isCurrent ? 'h6' : 'body1'}>{p.pid}</Typography>
                          </Box>
                        );
                      })}

                      {patients.length === 0 && (
                        <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: 2 }}>
                          No waiting patients
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
