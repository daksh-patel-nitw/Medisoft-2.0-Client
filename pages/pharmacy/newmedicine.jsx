import React, { useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Skeleton
} from '@mui/material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { decodeToFlags } from '../../utils/permissions.util';
import ConfirmDialog from '../../components/ConfirmDialog';
import CardActionButton from '../../components/CardActionButton';
import MedicineForm, { EMPTY_MEDICINE, validateMedicine, toMedicinePayload, sellsLoose } from '../../components/MedicineForm';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// Same rule the API enforces for a category name (letters, digits, spaces).
const CATEGORY_PATTERN = /^[\p{L}\p{M}\p{N}\s]+$/u;

// ==========================================
// TAB 1: add a medicine
// ==========================================
function MedicineTab({ categories, onAdd }) {
  const [values, setValues] = useState(EMPTY_MEDICINE);
  const [errors, setErrors] = useState({});

  const submit = async (event) => {
    event.preventDefault();
    const found = validateMedicine(values, sellsLoose(categories, values.t));
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const ok = await onAdd(toMedicinePayload(values));
    if (ok) setValues(EMPTY_MEDICINE);
  };

  return (
    <form onSubmit={submit} autoComplete="off" noValidate style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      {/* pt: room for the outlined field's floating label */}
      <Box sx={{ pt: 1 }}>
        <MedicineForm
          values={values}
          onChange={(next) => {
            setValues(next);
            setErrors({});
          }}
          categories={categories}
          errors={errors}
        />
      </Box>
      <CardActionButton type="submit">Add medicine</CardActionButton>
    </form>
  );
}

// ==========================================
// TAB 2: categories - the add form on top, the existing ones as small chips below
// ==========================================
function CategoryTab({ categories, canManage, onAdd, onDelete }) {
  const [name, setName] = useState('');
  const [freeQuantity, setFreeQuantity] = useState('Y');

  const trimmed = name.trim();
  const isValid = trimmed.length > 0 && CATEGORY_PATTERN.test(trimmed);
  const showError = name.length > 0 && !isValid;

  const submit = async () => {
    if (!isValid) return;
    const ok = await onAdd({ category: trimmed, freeQuantity });
    if (ok) setName('');
  };

  return (
    <>
      {canManage && (
        <>
          <Grid container spacing={2} alignItems="flex-start" sx={{ pt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="New category name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                error={showError}
                helperText={showError ? 'Letters, numbers and spaces only' : ' '}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Sold in loose pieces?"
                value={freeQuantity}
                onChange={(e) => setFreeQuantity(e.target.value)}
              >
                <MenuItem value="Y">Yes - e.g. tablets</MenuItem>
                <MenuItem value="N">No - full packs only</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Button fullWidth variant="contained" color="primary" onClick={submit} disabled={!isValid} sx={{ height: 40 }}>
                Add category
              </Button>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
        </>
      )}

      {categories.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No categories yet.
        </Typography>
      ) : (
        // two columns: what can be sold in loose pieces, and what is sold in full packs only
        <Grid container spacing={2}>
          {[
            { flag: 'Y', title: 'Sold in loose pieces', hint: 'e.g. tablets' },
            { flag: 'N', title: 'Full packs only', hint: 'e.g. syrups' },
          ].map((column) => {
            const inColumn = categories.filter((c) => c.freeQuantity === column.flag);
            return (
              <Grid key={column.flag} size={{ xs: 6 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {column.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                  {column.hint}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: 32 }}>
                  {inColumn.map((c) => (
                    <Chip key={c._id} size="small" label={c.name} color="primary" variant={column.flag === 'Y' ? 'filled' : 'outlined'} onDelete={canManage ? () => onDelete(c) : undefined} />
                  ))}
                  {inColumn.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      None
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function NewMedicinePage({ currentUser }) {
  const [tab, setTab] = useState('medicine');
  const [categories, setCategories] = useState(null); // null = still loading
  const [reloadKey, setReloadKey] = useState(0);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  // Decoded once per currentUser change, reused for every show/hide check.
  const flags = useMemo(() => decodeToFlags(currentUser?.permissions), [currentUser?.permissions]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest('/pharmacy/types');
        if (!cancelled) setCategories(data || []);
      } catch (error) {
        if (!cancelled) setCategories([]);
      } finally {
        finishRefresh();
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick, reloadKey]);

  // Each handler resolves true on success (so the form can clear) and false on
  // a server rejection - which the http client has already toasted.
  const addCategory = async (body) => {
    try {
      await apis.postRequest('/pharmacy/types', body);
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      return false;
    }
  };

  const confirmDeleteCategory = async () => {
    const { _id } = categoryToDelete;
    setCategoryToDelete(null);
    try {
      await apis.deleteRequest(`/pharmacy/types?id=${encodeURIComponent(_id)}`);
      setReloadKey((k) => k + 1);
    } catch (error) {
      // Already toasted by the http client.
    }
  };

  const addMedicine = async (payload) => {
    try {
      await apis.postRequest('/pharmacy', payload);
      return true;
    } catch (error) {
      return false;
    }
  };

  return (
    // One card, centered horizontally; the tabs name the two sections.
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3, height: '100%', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
        {categories === null ? (
          <>
            <Skeleton variant="rectangular" height={48} />
            <CardContent>
              <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1 }} />
            </CardContent>
          </>
        ) : (
          <>
            <Tabs
              value={tab}
              indicatorColor="primary"
              textColor="primary"
              onChange={(e, next) => setTab(next)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
            >
              <Tab value="medicine" label="Medicine" />
              <Tab value="category" label="Medicine Category" />
            </Tabs>

            <CardContent sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {tab === 'medicine' && <MedicineTab categories={categories} onAdd={addMedicine} />}
              {tab === 'category' && (
                <CategoryTab
                  categories={categories}
                  canManage={flags.has('manageMedicineCategories')}
                  onAdd={addCategory}
                  onDelete={setCategoryToDelete}
                />
              )}
            </CardContent>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={categoryToDelete !== null}
        message={`Delete the category "${categoryToDelete?.name ?? ''}"?`}
        onConfirm={confirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </Box>
  );
}

// Next.js Security & Layout Flags
NewMedicinePage.layout = 'dashboard';
NewMedicinePage.requiredPermissions = PAGE_ACCESS.pharmacyNewMedicine;
