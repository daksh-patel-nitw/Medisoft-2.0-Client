import React, { useState, useEffect } from 'react';
import { TextField, Box, Typography, Button, Skeleton } from '@mui/material';
import { apis } from '../services/commonServices';
import CardActionButton from './CardActionButton';
import DoctorPicker from './DoctorPicker';
import { browserTimeZone, todayInputValue, zonedTimeToUtc } from '../utils/timeZone';

/**
 * The API calls the booking flow needs. By default it uses the reception
 * routes; another screen (e.g. the member menu, where someone books their OWN
 * appointment) passes its own set - keep that object STABLE (a module constant
 * or useMemo), because the doctor list is re-read when it changes.
 *
 *  getDoctors(patientId)        -> [{ did, dname, dep, price, timezone }]  (without the doctors that patient already has an appointment with)
 *  getTimings(did, dateIso)     -> [{ timing: 'HH:mm', count: slotsLeft }]
 *  book({ pid, did, schedule_date, userTimezone }) -> resolves when booked
 */
export const receptionBookingApi = {
  // the patient's id goes in the body: a doctor that patient already has an appointment with is not listed
  getDoctors: async (patientId) => (await apis.postReadRequest('/reception/doctors', { pid: patientId }))?.doctors ?? [],
  getTimings: (did, dateIso) => apis.postReadRequest('/reception/getdoctorTimings', { did, date: dateIso }),
  book: (payload) => apis.postRequest('/reception/appointment', payload),
};

/**
 * Shared "select doctor -> select date -> pick a time -> book" flow, for one
 * patient. Used by reception's Book Appointment (after the patient is found)
 * and meant to be reused by the member menu.
 *
 * It fills the height of its parent (a flex column), with the Book button at the bottom.
 *
 * @param {string} patientId - the patient the appointment is for
 * @param {() => void} [onBooked] - called after a successful booking
 * @param {typeof receptionBookingApi} [api]
 */
export default function AppointmentBooking({ patientId, onBooked, api = receptionBookingApi }) {
  const [doctors, setDoctors] = useState(null); // null = still loading
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null); // null = not loaded / loading, [] = none
  const [slot, setSlot] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getDoctors(patientId)
      .then((list) => !cancelled && setDoctors(list || []))
      .catch(() => !cancelled && setDoctors([]));
    return () => {
      cancelled = true;
    };
  }, [api, patientId]);

  const chooseDoctor = (next) => {
    setDoctor(next);
    setDate('');
    setSlots(null);
    setSlot('');
  };

  // Slot times are the doctor's clock times, so the day and the slot's instant are built in the doctor's timezone.
  const chooseDate = async (event) => {
    const value = event.target.value;
    setDate(value);
    setSlot('');
    setSlots(null);
    if (!value || value < todayInputValue()) return;
    try {
      // noon on that day in the doctor's zone - only the calendar date matters to the API
      const dateIso = zonedTimeToUtc(value, '12:00', doctor.timezone).toISOString();
      const result = await api.getTimings(doctor.did, dateIso);
      setSlots(result || []);
    } catch (error) {
      setSlots([]); // e.g. the doctor doesn't work that day - already toasted by the http client
    }
  };

  const book = async () => {
    try {
      await api.book({
        pid: patientId,
        did: doctor.did,
        schedule_date: zonedTimeToUtc(date, slot, doctor.timezone).toISOString(),
        userTimezone: browserTimeZone(),
      });
      onBooked?.();
    } catch (error) {
      // Already toasted by the http client; keep the choices so the user can pick another slot.
    }
  };

  const isPast = (timing) => zonedTimeToUtc(date, timing, doctor.timezone) < new Date();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', pt: 1, pr: 0.5 }}>
        {/* 1. doctor - the shared doctor picker (this flow lists OUTPATIENT doctors) */}
        <DoctorPicker doctors={doctors} value={doctor} onChange={chooseDoctor} />

        {/* 2. date */}
        {doctor && (
          <TextField
            fullWidth
            size="small"
            sx={{ mt: 3 }}
            label="Select date"
            type="date"
            value={date}
            onChange={chooseDate}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayInputValue() } }}
          />
        )}

        {/* 3. the doctor's timings for that date */}
        {doctor && date && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Available timings
            </Typography>
            {slots === null ? (
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            ) : slots.length === 0 ? (
              <Typography color="text.secondary">No timings available for this date.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {slots.map(({ timing, count }) => {
                  const unavailable = count === 0 || isPast(timing);
                  return (
                    <Button
                      key={timing}
                      variant={slot === timing ? 'contained' : 'outlined'}
                      disabled={unavailable}
                      onClick={() => setSlot(timing)}
                      title={count === 0 ? 'Fully booked' : isPast(timing) ? 'This time has passed' : undefined}
                      sx={{ flexDirection: 'column', lineHeight: 1.2, py: 0.75, minWidth: 96 }}
                    >
                      <span>{timing}</span>
                      <Typography component="span" variant="caption">
                        {count === 0 ? 'full' : `${count} left`}
                      </Typography>
                    </Button>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>

      <CardActionButton onClick={book} disabled={!doctor || !date || !slot}>
        Book appointment
      </CardActionButton>
    </Box>
  );
}
