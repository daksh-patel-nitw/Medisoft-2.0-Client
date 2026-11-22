import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MedicationIcon from '@mui/icons-material/Medication';
import ScienceIcon from '@mui/icons-material/Science';
import { toast } from 'react-toastify';
import { apis } from '../services/commonServices';
import usePrescriptionCatalogStore from '../store/usePrescriptionCatalogStore';
import { MAX_DAYS, MEDICINE_TIMES, computeQuantity } from '../utils/prescription.util';

const DAYS_PATTERN = /^\d{1,3}$/;

// A medicine row is valid with 1..MAX_DAYS days and at least one dose time.
const rowError = (row) => {
  if (!DAYS_PATTERN.test(row.days) || Number(row.days) < 1 || Number(row.days) > MAX_DAYS) return `Days must be 1-${MAX_DAYS}`;
  if (row.times.length === 0) return 'Pick at least one time';
  return null;
};

/**
 * The prescription form the OPD and IPD doctor pages share: lab tests, medicines
 * (name, number of days, dose times) and notes, sent to one diagnose endpoint.
 *
 * - All lab tests go in one list and are sent together.
 * - The doctor searches a medicine by NAME only. The days and dose times are
 *   typed per medicine; the quantity is worked out (days x doses per day for
 *   free-quantity types, otherwise 1) and sent along with the medicine id.
 *
 * Mount it with a `key` that changes per patient/appointment so it starts blank.
 *
 * @param {string} aid - the appointment being prescribed against
 * @param {string} endpoint - '/doctor/diagnoseOPD' or '/doctor/diagnoseIPD'
 * @param {string} [initialNotes]
 * @param {string} [submitLabel]
 * @param {boolean} [allowEmpty] - OPD may close a visit with nothing prescribed; IPD may not
 * @param {() => void} [onDone] - called after the server accepted the prescription
 */
export default function PrescriptionPanel({ aid, endpoint, initialNotes = '', submitLabel = 'Submit', allowEmpty = false, onDone }) {
  const { labs, medicines, loading, load } = usePrescriptionCatalogStore();
  const [selectedLabs, setSelectedLabs] = useState([]);
  const [rows, setRows] = useState([]); // [{ medicine, days: '', times: [] }]
  const [medicineInput, setMedicineInput] = useState('');
  const [notes, setNotes] = useState(initialNotes);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const medicineOptions = useMemo(() => {
    const used = new Set(rows.map((r) => r.medicine._id));
    return medicines.filter((m) => !used.has(m._id));
  }, [medicines, rows]);

  const addMedicine = (medicine) => {
    if (!medicine) return;
    setRows((prev) => [...prev, { medicine, days: '', times: [] }]);
    setMedicineInput('');
  };
  const updateRow = (id, patch) => setRows((prev) => prev.map((r) => (r.medicine._id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.medicine._id !== id));

  const hasContent = selectedLabs.length > 0 || rows.length > 0 || notes.trim() !== '';

  const handleSubmit = async () => {
    setSubmitted(true);
    if (rows.some(rowError)) return;
    if (!allowEmpty && !hasContent) {
      toast.warn('Add a lab test, a medicine or a note first.');
      return;
    }
    setSaving(true);
    try {
      await apis.postRequest(endpoint, {
        aid,
        ...(notes.trim() && { notes: notes.trim() }),
        ...(rows.length > 0 && {
          medicines: rows.map((r) => ({
            id: r.medicine._id,
            time: r.times,
            quantity: String(computeQuantity(r.medicine, r.days, r.times.length)),
          })),
        }),
        ...(selectedLabs.length > 0 && { labs: selectedLabs.map((l) => l._id) }),
      });
      onDone?.();
    } catch (error) {
      // already toasted by the http client; the form keeps what was typed
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      {/* Lab tests */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <ScienceIcon color="secondary" />
            <Typography variant="h6">Lab tests</Typography>
          </Stack>
          <Autocomplete
            multiple
            disableCloseOnSelect
            loading={loading}
            options={labs}
            value={selectedLabs}
            onChange={(e, value) => setSelectedLabs(value)}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a._id === b._id}
            noOptionsText="No lab tests found"
            renderInput={(params) => <TextField {...params} size="small" label="Search lab tests" />}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return <Chip key={key} size="small" color="secondary" variant="outlined" label={option.name} {...tagProps} />;
              })
            }
          />
        </CardContent>
      </Card>

      {/* Medicines */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <MedicationIcon color="primary" />
            <Typography variant="h6">Medicines</Typography>
          </Stack>

          <Autocomplete
            value={null}
            inputValue={medicineInput}
            onInputChange={(e, value, reason) => {
              if (reason !== 'reset') setMedicineInput(value);
            }}
            onChange={(e, medicine) => addMedicine(medicine)}
            loading={loading}
            options={medicineOptions}
            getOptionLabel={(o) => o.name}
            blurOnSelect
            noOptionsText="No medicines found"
            renderInput={(params) => <TextField {...params} size="small" label="Type a medicine name to add it" />}
          />

          {rows.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              No medicines added.
            </Typography>
          ) : (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {rows.map((row, index) => {
                const id = row.medicine._id;
                const error = submitted ? rowError(row) : null;
                const free = row.medicine.t?.freeQuantity === 'Y';
                const quantity = computeQuantity(row.medicine, row.days, row.times.length);
                return (
                  <Box
                    key={id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: 1,
                      borderColor: error ? 'error.main' : 'divider',
                      bgcolor: index % 2 ? 'action.hover' : 'transparent',
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography fontWeight="bold">{row.medicine.name}</Typography>
                      <Tooltip title="Remove">
                        <IconButton size="small" onClick={() => removeRow(id)} aria-label={`Remove ${row.medicine.name}`}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1 }} alignItems={{ sm: 'center' }}>
                      <TextField
                        size="small"
                        label="Days"
                        value={row.days}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || /^\d{0,3}$/.test(v)) updateRow(id, { days: v });
                        }}
                        slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                        sx={{ width: { sm: 100 } }}
                      />
                      <Select
                        multiple
                        displayEmpty
                        size="small"
                        value={row.times}
                        onChange={(e) => updateRow(id, { times: MEDICINE_TIMES.filter((t) => e.target.value.includes(t)) })}
                        renderValue={(selected) =>
                          selected.length === 0 ? (
                            <Typography color="text.secondary">Times to take</Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((t) => (
                                <Chip key={t} size="small" label={t} />
                              ))}
                            </Box>
                          )
                        }
                        sx={{ flexGrow: 1, minWidth: 0 }}
                      >
                        {MEDICINE_TIMES.map((t) => (
                          <MenuItem key={t} value={t}>
                            <Checkbox checked={row.times.includes(t)} size="small" />
                            <ListItemText primary={t} />
                          </MenuItem>
                        ))}
                      </Select>
                      <Chip
                        size="small"
                        color={free ? 'primary' : 'default'}
                        variant="outlined"
                        label={free ? `Quantity: ${quantity}` : 'Quantity: 1 pack'}
                      />
                    </Stack>
                    {error && (
                      <Typography variant="caption" color="error">
                        {error}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Notes + submit */}
      <Card variant="outlined">
        <CardContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <Button fullWidth variant="contained" size="large" sx={{ mt: 2 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
