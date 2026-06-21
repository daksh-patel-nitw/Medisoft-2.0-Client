import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  TablePagination,
  Autocomplete,
  Box,
  Typography,
  Skeleton,
  Divider
} from '@mui/material';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';

// ==========================================
// THE SKELETON LOADER COMPONENT
// ==========================================
const RoleManagementSkeleton = () => (
  <Box sx={{ width: '100%', maxWidth: 800, mt: 3, height: '70vh', display: 'flex', flexDirection: 'column' }}>
    <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1, mb: 1 }} />
    <Card sx={{ boxShadow: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Grid>
          <Grid size={{ xs: 12 }}>
            <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} />
          </Grid>
        </Grid>
        <Box sx={{ mt: 'auto' }}>
          <Divider sx={{ mb: 2, mt: 2 }} />
          <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
        </Box>
      </CardContent>
    </Card>
  </Box>
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

  const [empValues, setEmpValues] = useState({ eid: '', name: '', role: '', dep: '', mobile: '' });

  const [filtered, setFilter] = useState([]);
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
      if (newValue) {
        setFilter(loginEmp.filter((m) => m.role?.toLowerCase() === newValue.toLowerCase()));
      } else {
        setFilter([]);
      }
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

  const deleteT = async (id, name, role) => {
    if (!window.confirm(`Are you sure you want to revoke this ${role} role for ${name}?`)) return;

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
        <TextField {...params} label={label} margin="normal" variant="outlined" size="small" />
      )}
    />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        px: 2,
        py: 2
      }}
    >
      {isLoading ? (
        <RoleManagementSkeleton />
      ) : (
        <Card sx={{ width: '100%', maxWidth: 800, mt: 3, boxShadow: 3, height: '70vh', display: 'flex', flexDirection: 'column' }}>
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
                <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}>
                      {renderAutocomplete(0, 'Employee ID', 'eid')}
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      {renderAutocomplete(0, 'Search by Name', 'name')}
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      {renderAutocomplete(0, 'Select Panel (Role)', 'role')}
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
                          </  >
                        ) : (
                          <Box display="flex" height="100%" alignItems="center" justifyContent="center">
                            <Typography align="center" color="text.secondary">No Employee Selected</Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Bottom Anchored Button */}
                <Box sx={{ mt: 'auto', pt: 2 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Button type="submit" variant="contained" color="primary" fullWidth size="large">
                    Grant Access
                  </Button>
                </Box>
              </form>
            )}

            {/* TAB 2: View Roles Table */}
            {value === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ mb: 1 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Autocomplete
                        options={panel}
                        onChange={(event, newValue) => handleSearch(newValue, null, 1)}
                        renderInput={(params) => (
                          <TextField {...params} label="Filter By Panel" margin="normal" variant="outlined" size="small" />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>Panel (Role)</TableCell>
                        <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>Mobile</TableCell>
                        <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                        <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>Department</TableCell>
                        <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(filtered.length ? filtered : loginEmp)
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((e, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{e.name}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                                {e.role}
                              </Typography>
                            </TableCell>
                            <TableCell>{e.mobile}</TableCell>
                            <TableCell>{e.email}</TableCell>
                            <TableCell>{e.dep}</TableCell>
                            <TableCell align="center">
                              <Button
                                onClick={() => deleteT(e.eid, e.name, e.role)}
                                variant="outlined"
                                color="error"
                                size="small"
                              >
                                Revoke
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                      {loginEmp.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">No roles currently assigned.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Bottom Anchored Pagination */}
                <Box sx={{ mt: 'auto', pt: 1 }}>
                  <Divider />
                  <TablePagination
                    rowsPerPageOptions={rowsPerPageOptions}
                    component="div"
                    count={filtered.length ? filtered.length : loginEmp.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                  />
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// NEXT.JS SECURITY GATE
RoleManagementPage.layout = 'dashboard';
RoleManagementPage.allowedRoles = ['admin'];