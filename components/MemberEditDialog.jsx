import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { toDateInput, validators } from '../utils/memberValidation';
import useDegreesStore from '../store/useDegreesStore';

// Every field reception may correct, with its rule. `only` limits a field to one kind of member.
const FIELDS = [
  { key: 'fname', label: 'First name', validate: validators.name, size: 4 },
  { key: 'middlename', label: 'Middle name', validate: validators.name, size: 4 },
  { key: 'lname', label: 'Last name', validate: validators.name, size: 4 },
  { key: 'dob', label: 'Date of birth', type: 'date', validate: validators.dob, size: 6 },
  { key: 'gender', label: 'Gender', select: true, size: 6 },
  { key: 'mobile', label: 'Mobile', validate: validators.mobile, size: 6, inputMode: 'numeric' },
  { key: 'email', label: 'Email', validate: validators.email, size: 6 },
  { key: 'address', label: 'Address', validate: validators.address, size: 12 },
  { key: 'city', label: 'City', validate: validators.city, size: 6 },
  { key: 'pincode', label: 'Pincode', validate: validators.pincode, size: 6, inputMode: 'numeric' },
  { key: 'allergy', label: 'Allergy', validate: validators.note, only: 'pat', size: 6, optional: true },
  { key: 'conditions', label: 'Medical conditions', validate: validators.note, only: 'pat', size: 6, optional: true },
  { key: 'others', label: 'Others', validate: validators.note, only: 'pat', size: 12, optional: true },
  { key: 'weight', label: 'Weight (kg)', validate: validators.positive, only: 'pat', size: 6, optional: true, inputMode: 'decimal' },
  { key: 'height', label: 'Height (cm)', validate: validators.positive, only: 'pat', size: 6, optional: true, inputMode: 'decimal' },
  { key: 'degree', label: 'Degree', degree: true, validate: (v) => (v ? '' : 'Pick a degree from the list'), only: 'emp', size: 6, optional: true },
  { key: 'college', label: 'College', validate: validators.college, only: 'emp', size: 6, optional: true },
];

const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
];

// what the form starts with, from the row (dates as YYYY-MM-DD, numbers as text)
const initialValue = (row, key) => {
  if (key === 'dob') return toDateInput(row.dob);
  return row[key] == null ? '' : String(row[key]);
};

/**
 * Reception's correction dialog for one patient or employee row (a wrong name, date of birth, gender,
 * phone number...). Only the fields that were actually changed are sent, together with the member's id and
 * type. Cancel and Save only - no close (X), and clicking outside does nothing.
 *
 * Mount it only while open so it starts from the row's current values.
 *
 * @param {object} row - { id, mtype: 'pat' | 'emp', fname, ... } as listed by GET /reception/members
 * @param {(payload: object) => Promise<boolean>} onSave - resolves true when the server accepted it
 * @param {() => void} onCancel
 */
export default function MemberEditDialog({ row, onSave, onCancel }) {
  const fields = useMemo(() => FIELDS.filter((f) => !f.only || f.only === row.mtype), [row.mtype]);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, initialValue(row, f.key)])));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { degrees, load: loadDegrees } = useDegreesStore();

  useEffect(() => {
    loadDegrees();
  }, [loadDegrees]);

  const errors = Object.fromEntries(
    fields.map((f) => [f.key, f.select ? '' : f.optional && String(values[f.key]).trim() === '' ? '' : f.validate(values[f.key])]),
  );

  const changes = {};
  for (const f of fields) {
    const now = String(values[f.key]).trim();
    if (now !== initialValue(row, f.key)) changes[f.key] = now;
  }
  const changedKeys = Object.keys(changes);

  const handleSave = async () => {
    setSubmitted(true);
    if (changedKeys.length === 0 || changedKeys.some((key) => errors[key])) return;
    setSaving(true);
    const ok = await onSave({ mtype: row.mtype, id: row.id, ...changes });
    if (!ok) setSaving(false); // rejected (already toasted): keep the form so nothing typed is lost
  };

  return (
    <Dialog open onClose={() => {}} disableEscapeKeyDown maxWidth="md" fullWidth>
      <DialogTitle>
        Edit {row.mtype === 'pat' ? 'patient' : 'employee'} <strong>{row.id}</strong>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {fields.map((f) => (
            <Grid key={f.key} size={{ xs: 12, sm: f.size }}>
              {f.degree ? (
                <Autocomplete
                  size="small"
                  options={degrees}
                  value={values.degree || null}
                  onChange={(e, next) => setValues((prev) => ({ ...prev, degree: next || '' }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={f.label}
                      error={submitted && Boolean(errors.degree)}
                      helperText={submitted && errors.degree ? errors.degree : ' '}
                      slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps?.inputLabel, shrink: true } }}
                    />
                  )}
                />
              ) : (
              <TextField
                fullWidth
                size="small"
                select={f.select}
                type={f.type}
                label={f.label}
                value={values[f.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                error={submitted && Boolean(errors[f.key])}
                helperText={submitted && errors[f.key] ? errors[f.key] : ' '}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: f.inputMode ? { inputMode: f.inputMode } : undefined }}
              >
                {f.select && GENDERS.map((g) => (
                  <MenuItem key={g.value} value={g.value}>
                    {g.label}
                  </MenuItem>
                ))}
              </TextField>
              )}
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || changedKeys.length === 0}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
