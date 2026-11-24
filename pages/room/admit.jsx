import React, { useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import { toast } from 'react-toastify';
import { Alert, Card, CardContent, Box, Button, Typography, Chip, Radio, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apis } from '../../services/commonServices';
import DataTable from '../../components/DataTable';
import PatientFinder from '../../components/PatientFinder';
import DoctorPicker from '../../components/DoctorPicker';
import CardActionButton from '../../components/CardActionButton';
import RoomCategoryDetails from '../../components/RoomCategoryDetails';
import { browserTimeZone, todayInputValue, zonedTimeToUtc } from '../../utils/timeZone';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// An <input type="datetime-local"> value (YYYY-MM-DDTHH:mm) for a Date, in the browser's own time zone.
const toLocalInput = (date) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
};
const SHIFT_MAX_BACK_MS = 2 * 24 * 60 * 60 * 1000; // a shift can be entered up to 2 days late

// ==========================================
// STEP 2: choose the doctor, then a room in the doctor's department, then admit
// ==========================================
function AdmitStep({ patient, onBack, onAdmitted }) {
  const [doctors, setDoctors] = useState(null); // inpatient doctors; null = still loading
  const [categories, setCategories] = useState([]); // for the amenities panel
  const [doctor, setDoctor] = useState(null);
  const [rooms, setRooms] = useState(null); // rooms with a free bed in the doctor's department; null = not loaded
  const [roomId, setRoomId] = useState('');
  const [admitDate, setAdmitDate] = useState(todayInputValue());
  // A shift records when the patient actually moved: its date AND time start as right now, and can go back up to 2 days.
  const [shiftAt, setShiftAt] = useState(() => toLocalInput(new Date()));
  const [shiftMin] = useState(() => toLocalInput(new Date(Date.now() - SHIFT_MAX_BACK_MS)));
  // Where the patient is admitted right now (null = still checking). Decided by the check, never by a toggle:
  // a patient already in a bed can only be SHIFTED, anyone else is admitted.
  const [current, setCurrent] = useState(null);
  const shifting = current?.admitted === true;

  // GET /room/doctors: the doctors a patient can be admitted under (inpatient doctors); and the admission check.
  useEffect(() => {
    let cancelled = false;
    apis
      .getRequest('/room/prescription/current', { pid: patient.pid })
      .then((info) => !cancelled && setCurrent(info ?? { admitted: false }))
      .catch(() => !cancelled && setCurrent({ admitted: false }));
    apis
      .getRequest('/room/doctors')
      .then((list) => !cancelled && setDoctors(list || []))
      .catch(() => !cancelled && setDoctors([]));
    apis
      .getRequest('/room/category')
      .then((list) => !cancelled && setCategories(list || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [patient.pid]);

  // GET /room/dep/:dep: the rooms in that department that still have a free bed.
  const chooseDoctor = async (next) => {
    setDoctor(next);
    setRoomId('');
    setRooms(null);
    if (!next) return;
    try {
      const list = await apis.getRequest(`/room/dep/${encodeURIComponent(next.dep)}`);
      setRooms(list || []);
    } catch (error) {
      setRooms([]);
    }
  };

  const selectedRoom = rooms?.find((r) => r._id === roomId);
  const selectedCategory = selectedRoom ? categories.find((c) => c._id === selectedRoom.category?._id) : null;

  const columns = useMemo(
    () => [
      {
        key: 'pick',
        label: '',
        minWidth: 48,
        render: (r) => <Radio size="small" checked={roomId === r._id} onChange={() => setRoomId(r._id)} sx={{ p: 0.5 }} />,
      },
      { key: 'room_no', label: 'Room' },
      { key: 'floor', label: 'Floor', align: 'right' },
      { key: 'category', label: 'Category', render: (r) => <Chip size="small" variant="outlined" color="primary" label={r.category?.name ?? '-'} /> },
      { key: 'price', label: '₹ / day', align: 'right', render: (r) => (r.category?.pricePerDay != null ? Number(r.category.pricePerDay).toFixed(0) : '-') },
      { key: 'freeBeds', label: 'Free beds', align: 'right', render: (r) => `${r.freeBeds} of ${r.beds}` },
    ],
    [roomId]
  );

  const admit = async () => {
    let admit_date;
    if (shifting) {
      // exactly the picked date and time (never in the future, at most 2 days back, not before the stay began)
      admit_date = new Date(shiftAt);
      const now = Date.now();
      if (Number.isNaN(admit_date.getTime())) return toast.error('Pick the date and time of the shift.');
      if (admit_date.getTime() > now + 60 * 1000) return toast.error('The shift time cannot be in the future.');
      if (admit_date.getTime() < now - SHIFT_MAX_BACK_MS) return toast.error('The shift time cannot be more than 2 days back.');
      if (current?.since && admit_date.getTime() < new Date(current.since).getTime()) return toast.error('The shift cannot be earlier than the time the current admission began.');
    } else {
      // today -> right now; a later day -> the start of that day in the browser's timezone
      admit_date = admitDate === todayInputValue() ? new Date() : zonedTimeToUtc(admitDate, '00:00', browserTimeZone());
    }
    try {
      await apis.postRequest('/room/prescription', {
        did: doctor.did,
        patient_id: patient.pid,
        room_id: roomId,
        userTimezone: browserTimeZone(),
        admit_date: admit_date.toISOString(),
        type: shifting ? 's' : 'a',
      });
      onAdmitted();
    } catch (error) {
      // Already toasted by the http client (e.g. already admitted, or no free bed); keep the choices.
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
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

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', pt: 1, pr: 0.5 }}>
        {/* already in a bed? then the only thing to do here is shift them to another room */}
        {shifting && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Currently admitted in room <strong>{current.room_no}</strong>
            {current.department ? ` (${current.department})` : ''}
            {current.dname ? ` under Dr. ${current.dname}` : ''}
            {current.since ? ` since ${new Date(current.since).toLocaleDateString([], { dateStyle: 'medium' })}` : ''}. Choose the doctor and the new room, and the date to shift.
          </Alert>
        )}

        {/* 1. the (inpatient) doctor */}
        <Box sx={{ maxWidth: 480 }}>
          <DoctorPicker doctors={doctors} value={doctor} onChange={chooseDoctor} label="Select doctor (inpatient)" priceSuffix="/day" />
        </Box>

        {/* 2. the rooms with a free bed in that doctor's department */}
        {doctor && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Rooms with a free bed in <span style={{ textTransform: 'capitalize' }}>{doctor.dep}</span>
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: selectedRoom ? 7 : 12 }}>
                <DataTable
                  columns={columns}
                  rows={rooms ?? []}
                  getRowKey={(r) => r._id}
                  loading={rooms === null}
                  emptyMessage={`No rooms with a free bed in ${doctor.dep}.`}
                  maxHeight="36vh"
                />
              </Grid>
              {/* the chosen room's category: price and every amenity */}
              {selectedRoom && (
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: '#fafafa', height: '100%' }}>
                    {selectedCategory ? (
                      <RoomCategoryDetails category={selectedCategory} showTitle />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Room {selectedRoom.room_no} · {selectedRoom.category?.name}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* 3. when: a shift is dated by the moment it happened (now by default, up to 2 days back); an admission by its day */}
        {doctor && selectedRoom && (
          <Box sx={{ mt: 3 }}>
            {shifting ? (
              <TextField
                size="small"
                label="Shift date and time"
                type="datetime-local"
                value={shiftAt}
                onChange={(e) => setShiftAt(e.target.value)}
                helperText="Now by default - change it only if the shift was not entered in time (up to 2 days back, never the future)"
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: shiftMin } }}
                sx={{ minWidth: 280 }}
              />
            ) : (
              <TextField
                size="small"
                label="Admission date"
                type="date"
                value={admitDate}
                onChange={(e) => setAdmitDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayInputValue() } }}
              />
            )}
          </Box>
        )}
      </Box>

      <CardActionButton onClick={admit} disabled={current === null || !doctor || !roomId || (shifting ? !shiftAt : !admitDate || admitDate < todayInputValue())}>
        {shifting ? 'Shift patient' : 'Admit patient'}
      </CardActionButton>
    </Box>
  );
}

// ==========================================
// MAIN PAGE COMPONENT: step 1 find the patient -> Next -> step 2 doctor, room, admit
// ==========================================
export default function AdmitPatientPage() {
  const [patient, setPatient] = useState(null);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 1000, boxShadow: 3, height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {patient ? (
            // after an admission, go back to the patient search for the next one
            <AdmitStep patient={patient} onBack={() => setPatient(null)} onAdmitted={() => setPatient(null)} />
          ) : (
            <PatientFinder onNext={setPatient} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
AdmitPatientPage.layout = 'dashboard';
AdmitPatientPage.requiredPermissions = PAGE_ACCESS.roomAdmit;
