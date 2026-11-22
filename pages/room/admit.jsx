import React, { useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import { Card, CardContent, Box, Button, Typography, Chip, Radio, TextField, FormControlLabel, Switch } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apis } from '../../services/commonServices';
import DataTable from '../../components/DataTable';
import PatientFinder from '../../components/PatientFinder';
import DoctorPicker from '../../components/DoctorPicker';
import CardActionButton from '../../components/CardActionButton';
import RoomCategoryDetails from '../../components/RoomCategoryDetails';
import { browserTimeZone, todayInputValue, zonedTimeToUtc } from '../../utils/timeZone';
import { PAGE_ACCESS } from '../../utils/pageAccess';

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
  const [shifting, setShifting] = useState(false); // true = the patient is already admitted and is moving rooms

  // GET /room/doctors: the doctors a patient can be admitted under (inpatient doctors).
  useEffect(() => {
    let cancelled = false;
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
  }, []);

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
    // today -> right now; a later day -> the start of that day in the browser's timezone
    const admit_date = admitDate === todayInputValue() ? new Date() : zonedTimeToUtc(admitDate, '00:00', browserTimeZone());
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

        {/* 3. when, and whether this is a shift */}
        {doctor && selectedRoom && (
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Admission date"
              type="date"
              value={admitDate}
              onChange={(e) => setAdmitDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayInputValue() } }}
            />
            <FormControlLabel
              control={<Switch checked={shifting} onChange={(e) => setShifting(e.target.checked)} />}
              label="Patient is already admitted - shift to this room"
            />
          </Box>
        )}
      </Box>

      <CardActionButton onClick={admit} disabled={!doctor || !roomId || !admitDate || admitDate < todayInputValue()}>
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
