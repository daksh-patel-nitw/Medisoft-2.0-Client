import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import ConfirmDialog from '../../components/ConfirmDialog';
import CardActionButton from '../../components/CardActionButton';
import RoomCategoryForm, { EMPTY_CATEGORY, validateCategory, toCategoryPayload } from '../../components/RoomCategoryForm';
import RoomCategoryDetails from '../../components/RoomCategoryDetails';
import RoomCategoryEditDialog from '../../components/RoomCategoryEditDialog';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// ==========================================
// TAB 1: add a category
// ==========================================
function AddCategoryTab() {
  const [values, setValues] = useState(EMPTY_CATEGORY);
  const [errors, setErrors] = useState({});

  const submit = async (event) => {
    event.preventDefault();
    const found = validateCategory(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await apis.postRequest('/room/category', toCategoryPayload(values));
      setValues(EMPTY_CATEGORY);
    } catch (error) {
      // Already toasted by the http client (e.g. the name already exists); keep the form.
    }
  };

  return (
    <form onSubmit={submit} autoComplete="off" noValidate style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', pt: 1 }}>
        <RoomCategoryForm
          values={values}
          onChange={(next) => {
            setValues(next);
            setErrors({});
          }}
          errors={errors}
        />
      </Box>
      <CardActionButton type="submit">Add category</CardActionButton>
    </form>
  );
}

// ==========================================
// TAB 2: the categories as accordions - open one to see its amenities; edit / delete on each
// ==========================================
function ManageCategoriesTab() {
  const [categories, setCategories] = useState(null); // null = still loading
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  // Mounted only while this tab is open, so switching back after adding a category shows it.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest('/room/category');
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

  const saveEdit = async (payload) => {
    try {
      await apis.putRequest('/room/category', payload);
      setEditing(null);
      setReloadKey((k) => k + 1);
      return true;
    } catch (error) {
      return false; // toasted by the http client; the dialog stays open with the values
    }
  };

  const confirmDelete = async () => {
    const { _id } = toDelete;
    setToDelete(null);
    try {
      await apis.deleteRequest(`/room/category?id=${encodeURIComponent(_id)}`);
      setReloadKey((k) => k + 1);
    } catch (error) {
      // e.g. rooms still use this category - already toasted by the http client.
    }
  };

  if (categories === null) {
    return [1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />);
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'scroll', pt: 1, pr: 1 }}>
      {categories.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
          No room categories yet.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {categories.map((c) => (
          <Accordion key={c._id} disableGutters variant="outlined" sx={{ borderRadius: 1, '&::before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5, my: 1 } }}>
              <Typography fontWeight="bold" sx={{ flexGrow: 1 }}>
                {c.name}
              </Typography>
              <Chip size="small" color="primary" variant="outlined" label={`₹${Number(c.pricePerDay).toFixed(0)} / day`} />
              {/* the icons sit inside the clickable summary: stop the click from also opening/closing the row */}
              <Tooltip title="Edit">
                <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); setEditing(c); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setToDelete(c); }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </AccordionSummary>
            <AccordionDetails>
              <RoomCategoryDetails category={c} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Mounted only while editing so the form always starts from that category. */}
      {editing && <RoomCategoryEditDialog key={editing._id} category={editing} onSave={saveEdit} onCancel={() => setEditing(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        message={`Delete the room category "${toDelete?.name ?? ''}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function RoomCategoriesPage() {
  const [tab, setTab] = useState('add');

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3, height: '100%', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
        <Tabs
          value={tab}
          indicatorColor="primary"
          textColor="primary"
          onChange={(e, next) => setTab(next)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
        >
          <Tab value="add" label="Add Category" />
          <Tab value="manage" label="Update / Delete" />
        </Tabs>

        <CardContent sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
          {tab === 'add' ? <AddCategoryTab /> : <ManageCategoriesTab />}
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
RoomCategoriesPage.layout = 'dashboard';
RoomCategoriesPage.requiredPermissions = PAGE_ACCESS.roomCategories;
