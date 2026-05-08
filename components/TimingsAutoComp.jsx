import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Popover,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { toast } from 'react-toastify';

// ==========================================
// COMPONENT 1: Scrollable List for Hours/Mins
// ==========================================
const ScrollList = ({ items, selected, onSelect }) => (
  <Box
    sx={{
      maxHeight: 150, // Slightly taller for better UX
      overflowY: 'auto',
      border: '1px solid #ccc',
      borderRadius: 1,
      width: "50%",
      '&::-webkit-scrollbar': { width: '6px' },
      '&::-webkit-scrollbar-thumb': { backgroundColor: '#bdbdbd', borderRadius: '4px' }
    }}
  >
    {items.map((item) => (
      <Box
        key={item}
        onClick={() => onSelect(item)}
        sx={{
          p: 1,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: selected === item ? '#1976d2' : 'transparent',
          color: selected === item ? 'white' : 'inherit',
          '&:hover': {
            backgroundColor: selected === item ? '#1565c0' : '#f5f5f5',
          }
        }}
      >
        <Typography>{item}</Typography>
      </Box>
    ))}
  </Box>
);

// ==========================================
// COMPONENT 2: Individual Time Picker Dropdown
// ==========================================
const TimePickerDropdown = ({ value, onChange, label }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [hour, setHour] = useState('01');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('p.m.');

  // Pre-generate hours (01-12) and minutes (00-59)
  const hours = [...Array(12)].map((_, i) => String(i + 1).padStart(2, '0'));
  const minutes = [...Array(60)].map((_, i) => String(i).padStart(2, '0'));

  const openPopover = (e) => setAnchorEl(e.currentTarget);
  const closePopover = () => setAnchorEl(null);

  const confirmTime = () => {
    const finalTime = `${hour}:${minute} ${period}`;
    onChange(finalTime);
    closePopover();
  };

  const open = Boolean(anchorEl);

  return (
    <Grid size={{ xs: 6 }}>
      <FormControl fullWidth size="small">
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          label={label}
          onClick={openPopover}
          readOnly
          // Prevent the default dropdown menu from opening since we use a Popover
          MenuProps={{ sx: { display: 'none' } }} 
        >
          <MenuItem value={value}>{value || label}</MenuItem>
        </Select>
      </FormControl>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: { minWidth: anchorEl?.offsetWidth || 200, mt: 1 },
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>AM/PM</InputLabel>
            <Select
              value={period}
              label="AM/PM"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="a.m.">a.m.</MenuItem>
              <MenuItem value="p.m.">p.m.</MenuItem>
            </Select>
          </FormControl>
          
          <Stack direction="row" spacing={1}>
            <ScrollList items={hours} selected={hour} onSelect={setHour} />
            <ScrollList items={minutes} selected={minute} onSelect={setMinute} />
          </Stack>

          <Button variant="contained" onClick={confirmTime} fullWidth>
            Confirm
          </Button>
        </Box>
      </Popover>
    </Grid>
  );
};

// ==========================================
// MAIN EXPORT: The Wrapper Component
// ==========================================
export default function TimingsPicker({ handleAdd }) {
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');

  const onAddClick = () => {
    if (!fromTime || !toTime) {
      toast.warn("Please select both 'From' and 'To' times");
      return;
    }
    
    const result = `${fromTime} - ${toTime}`;
    handleAdd(result);
    
    // Reset state after adding
    setFromTime('');
    setToTime('');
  };

  return (
    <Grid container size={{ xs: 12 }} spacing={1} mt={1}>
      <TimePickerDropdown
        label="From Time"
        value={fromTime}
        onChange={setFromTime}
      />

      <TimePickerDropdown
        label="To Time"
        value={toTime}
        onChange={setToTime}
      />

      <Grid size={{ xs: 12 }} mt={1}>
        <Button
          variant="contained"
          onClick={onAddClick}
          fullWidth
          sx={{ height: "100%", py: 1.5, fontWeight: "bold" }}
        >
          Add Timing Slot
        </Button>
      </Grid>
    </Grid>
  );
}