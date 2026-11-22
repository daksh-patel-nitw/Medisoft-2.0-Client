import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  Skeleton,
  Divider
} from '@mui/material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import ConfirmDialog from '../../components/ConfirmDialog';
import CardActionButton from '../../components/CardActionButton';
import DataTable from '../../components/DataTable';
import { PAGE_ACCESS } from '../../utils/pageAccess';

// Active-roles table columns for the shared DataTable (the Revoke button is its actions column).
const COLUMNS = [
  { key: 'name', label: 'Name' },
  {
    key: 'role',
    label: 'Role',
    render: (e) => (
      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
        {e.role}
      </Typography>
    ),
  },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'dep', label: 'Department' },
];

// The card fills the space the layout leaves (no page scrollbar); the table scrolls inside it.
const CARD_HEIGHT = '100%';

// ==========================================
// THE SKELETON LOADER COMPONENT
// ==========================================
const RoleManagementSkeleton = () => (
  // Same shape as the real card - the tab bar is INSIDE it, not a bar floating above.
  <Card sx={{ width: '100%', maxWidth: 800, height: CARD_HEIGHT, boxShadow: 3, display: 'flex', flexDirection: 'column' }}>
    <Skeleton variant="rectangular" height={48} sx={{ flexShrink: 0 }} />
    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Grid>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} />
        </Grid>
        <Grid size={{ xs: 12 }}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Grid>
      </Grid>
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ mb: 2, mt: 2 }} />
        <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
      </Box>
    </CardContent>
  </Card>
);

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function RoleManagementPage() {
  const [emp, setEmp] = useState([]);
  const [loginEmp, setLoginEmp] = useState([]);
  const [panel, setPanel] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState(0);
  const [revokeTarget, setRevokeTarget] = useState(null); // { id, name, role }

  const [empValues, setEmpValues] = useState({ eid: '', name: '', role: '', dep: '', mobile: '' });

  const [roleFilter, setRoleFilter] = useState(''); // '' = show every role
  const rowsPerPageOptions = [5, 7];
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [data] = await Promise.all([
        apis.getRequest('/admin/employees'),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      setEmp(data.availableEmployees || []);
      setLoginEmp(data.assignedEmployees || []);
      setPanel(data.roles || []);
    } catch (error) {
      console.error("Failed to fetch roles data");
    } finally {
      setIsLoading(false);
      finishRefresh();
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTick]);

  const handleSearch = (newValue, name, index) => {
    if (index === 0) {
      if (newValue) {
        if (name === 'eid' || name === 'name') {
          const t = emp.find((e) => e[name] === newValue);
          if (t) {
            setEmpValues({ ...empValues, mobile: t.mobile, eid: t.eid, name: t.name, dep: t.dep });
          }
        } else {
          setEmpValues({ ...empValues, role: newValue });
        }
      } else {
        if (name === 'role') {
          setEmpValues({ ...empValues, role: '' });
        } else {
          setEmpValues({ ...empValues, eid: '', name: '', dep: '', mobile: '' });
        }
      }
    } else {
      setRoleFilter(newValue || '');
      setPage(0);
    }
  };

  const handleEmpSubmit = async (event) => {
    event.preventDefault();
    if (!empValues.eid || !empValues.name) {
      toast.error("Please select an employee");
      return;
    }
    if (!empValues.role) {
      toast.error('Please select a Role');
      return;
    }
    try {
      await apis.patchRequest('/admin/employees', {
        eid: empValues.eid,
        role: empValues.role
      });

      const employeeData = emp.find(e => e.eid === empValues.eid);
      if (employeeData) {
        setLoginEmp([{ ...employeeData, role: empValues.role }, ...loginEmp]);
        setEmp(emp.filter((e) => e.eid !== empValues.eid));
      }

      setEmpValues({ eid: '', name: '', role: '', dep: '', mobile: '' });
    } catch (error) {}
  };

  const confirmRevoke = async () => {
    const { id } = revokeTarget;
    setRevokeTarget(null);
    try {
      await apis.deleteRequest(`/admin/employees/${id}`);

      const employeeToMove = loginEmp.find(e => e.eid === id);
      if (employeeToMove) {
        const { role, ...employeeWithoutRole } = employeeToMove;
        setLoginEmp(loginEmp.filter(e => e.eid !== id));
        setEmp([...emp, employeeWithoutRole]);
      }
    } catch (error) {}
  };

  const renderAutocomplete = (index, label, name) => (
    <Autocomplete
      options={name === 'role' || !name ? panel : emp.map((option) => option[name])}
      onChange={(event, newValue) => handleSearch(newValue, name, index)}
      value={name === 'role' || !name ? empValues.role || null : empValues[name] || null}
      fullWidth
      renderInput={(params) => (
        <TextField {...params} label={label} margin="none" variant="outlined" size="small" />
      )}
    />
  );

  // An active filter that matches nobody gives an empty table (the table then
  // shows its "no records" message) - it must NOT fall back to showing everyone.
  const rows = roleFilter
    ? loginEmp.filter((m) => m.role?.toLowerCase() === roleFilter.toLowerCase())
    : loginEmp;

  return (
    // One card, centered horizontally, with the two views as tabs. No top
    // margin, so it sits directly under the breadcrumb.
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      {isLoading ? (
        <RoleManagementSkeleton />
      ) : (
        <Card sx={{ width: '100%', maxWidth: 800, boxShadow: 3, height: CARD_HEIGHT, display: 'flex', flexDirection: 'column' }}>
          <Tabs
            value={value}
            indicatorColor="primary"
            textColor="primary"
            onChange={(e, newValue) => setValue(newValue)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
          >
            <Tab label="Assign New Role" />
            <Tab label="View Active Roles" />
          </Tabs>

          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', pb: '16px !important' }}>

            {/* TAB 1: Assign Role Form */}
            {value === 0 && (
              <form onSubmit={handleEmpSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* pt: the outlined fields' floating labels sit above their border; overflow would clip them without this room */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1, pt: 1.5 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                      {renderAutocomplete(0, 'Employee ID', 'eid')}
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      {renderAutocomplete(0, 'Search by Name', 'name')}
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ p: 2, minHeight: '165px', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        {empValues.eid ? (
                          <>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Selected Employee Details:
                            </Typography>
                            <Divider sx={{ mb: 1 }} />
                            <Typography><strong>ID:</strong> {empValues.eid}</Typography>
                            <Typography><strong>Name:</strong> {empValues.name}</Typography>
                            <Typography><strong>Department:</strong> {empValues.dep}</Typography>
                            <Typography><strong>Mobile:</strong> {empValues.mobile}</Typography>
                          </>
                        ) : (
                          <Box display="flex" minHeight="133px" alignItems="center" justifyContent="center">
                            <Typography align="center" color="text.secondary">No Employee Selected</Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>

                    {/* Role picker sits below the selected employee's details */}
                    <Grid size={{ xs: 12 }}>
                      {renderAutocomplete(0, 'Select Role', 'role')}
                    </Grid>
                  </Grid>
                </Box>

                <CardActionButton type="submit">Grant Access</CardActionButton>
              </form>
            )}

            {/* TAB 2: View Roles Table */}
            {value === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ mb: 2, pt: 1.5, maxWidth: 320 }}>
                  <Autocomplete
                    options={panel}
                    onChange={(event, newValue) => handleSearch(newValue, null, 1)}
                    renderInput={(params) => (
                      <TextField {...params} label="Filter By Role" margin="none" variant="outlined" size="small" />
                    )}
                  />
                </Box>

                <DataTable
                  columns={COLUMNS}
                  rows={rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
                  getRowKey={(e) => e.eid}
                  emptyMessage="No records available."
                  actionsLabel="Action"
                  fillHeight
                  renderActions={(e) => (
                    <Button
                      onClick={() => setRevokeTarget({ id: e.eid, name: e.name, role: e.role })}
                      variant="outlined"
                      color="error"
                      size="small"
                    >
                      Revoke
                    </Button>
                  )}
                  pagination={{
                    count: rows.length,
                    page,
                    rowsPerPage,
                    rowsPerPageOptions,
                    onPageChange: (e, newPage) => setPage(newPage),
                    onRowsPerPageChange: (e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    },
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        message={`Are you sure you want to revoke the ${revokeTarget?.role ?? ''} role for ${revokeTarget?.name ?? ''}?`}
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
RoleManagementPage.layout = 'dashboard';
RoleManagementPage.requiredPermissions = PAGE_ACCESS.manageRoles;
