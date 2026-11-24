import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

// The weekdays the API knows, in week order (workingDays on the server).
export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/**
 * Pick the weekdays a doctor sees patients: tap a day to switch it on or off.
 *
 * @param {string[]} value - the selected days, e.g. ['MON', 'WED']
 * @param {(days: string[]) => void} onChange - called with the new selection, in week order
 * @param {boolean} [error] - highlight the group (nothing selected)
 */
export default function WorkingDaysPicker({ value, onChange, error = false }) {
  return (
    <ToggleButtonGroup
      value={value}
      onChange={(e, days) => onChange(WEEKDAYS.filter((d) => days.includes(d)))}
      size="small"
      color={error ? 'error' : 'primary'}
      sx={{ flexWrap: 'wrap' }}
      aria-label="Working days"
    >
      {WEEKDAYS.map((day) => (
        <ToggleButton key={day} value={day} sx={{ px: 1.5 }}>
          {day}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
