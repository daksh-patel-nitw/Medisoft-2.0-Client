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
  CircularProgress
} from '@mui/material';
import { apis } from '../../services/commonServices';

export default function RoleManagementPage() {
  const [loginEmp, setLoginEmp] = useState([]);
  const [emp, setEmp] = useState([]);
  const [panel, setPanel] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab State
  const [value, setValue] = useState(0);

  // Category Form Values
  const [empValues, setEmpValues] = useState({ eid: '', name: '', role: '', dep: '', mobile: '' });

  // Table Pagination & Filter State
  const [filtered, setFilter] = useState([]);
  const rowsPerPageOptions = [5, 7];
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  // Fetch Data
  const fetchData = async () => {
    try {
      const data2 = await apis.noTokengetRequest('/member/admin');
      setEmp(data2[0] || []);
      setLoginEmp(data2[1] || []);
      setPanel(data2[2] || []);
    } catch (error) {
      console.error("Failed to fetch roles data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (newValue, name, index) => {
    if (index === 0) {
      if (newValue) {
        if (name) {
          const t = emp.find((e) => e[name] === newValue);
          if (t) {
            setEmpValues({ ...empValues, mobile: t.mobile, eid: t.eid, name: t.name, dep: t.dep });
          }
        } else {
          setEmpValues({ ...empValues, role: newValue });
        }
      } else {
        setEmpValues({ eid: '', name: '', role: '', dep: '', mobile: '' });
      }
    } else {
      if (newValue) {
        setFilter(loginEmp.filter((m) => m.role?.toLowerCase().includes(newValue.toLowerCase())));
      } else {
        setFilter([]);
      }
      setPage(0);
    }
  };

  const deleteT = async (id) => {
    const result = await apis.noTokenStatusDeleteRequest("member/role", id);
    if (result === 200) {
      const employee = loginEmp.find(e => e.eid === id);
      if (employee) {
        setLoginEmp(loginEmp.filter(e => e.eid !== id));
        setEmp([...emp, employee]);
        toast.success("Role access revoked successfully");
      }
    }
  };

  const handleEmpSubmit = async (event) => {
    event.preventDefault();
    if (!empValues.eid || !empValues.name) {
      toast.error("Please select an employee");
      return;
    }
    if (!empValues.role) {
      toast.error('Please select a role/panel');
      return;
    }

    const result = await apis.noTokenStatusPostRequest('member/role', empValues);
    if (result === 200) {
      setLoginEmp([empValues, ...loginEmp]);
      setEmp(emp.filter((e) => e.eid !== empValues.eid));
      setEmpValues({ eid: '', name: '', role: '', dep: '', mobile: '' });
      toast.success("Role assigned successfully");
    }
  };

  const renderAutocomplete = (index, label, name) => (
    <Autocomplete
      options={name ? emp.map((option) => option[name]) : panel}
      onChange={(event, newValue) => handleSearch(newValue, name, index)}
      value={name ? empValues[name] || null : empValues.role || null}
      fullWidth
      renderInput={(params) => (
        <TextField {...params} label={label} margin="normal" variant="outlined" size="small" />
      )}
    />
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        width: '100%', 
        px: 2, 
        py: 4 
      }}
    >
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Employee Role Management
      </Typography>

      <Card sx={{ width: '100%', maxWidth: 800, mt: 3, boxShadow: 3 }}>
        <Tabs
          value={value}
          indicatorColor="primary"
          textColor="primary"
          onChange={(e, newValue) => setValue(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Assign New Role" />
          <Tab label="View Active Roles" />
        </Tabs>

        <CardContent>
          {/* TAB 1: Assign Role Form */}
          {value === 0 && (
            <form onSubmit={handleEmpSubmit} autoComplete="off">
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  {renderAutocomplete(0, 'Employee ID', 'eid')}
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  {renderAutocomplete(0, 'Search by Name', 'name')}
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  {renderAutocomplete(0, 'Select Panel (Role)')}
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Selected Employee Details:</Typography>
                    <Typography><strong>ID:</strong> {empValues.eid || '—'}</Typography>
                    <Typography><strong>Name:</strong> {empValues.name || '—'}</Typography>
                    <Typography><strong>Department:</strong> {empValues.dep || '—'}</Typography>
                    <Typography><strong>Mobile:</strong> {empValues.mobile || '—'}</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Button type="submit" variant="contained" color="primary" fullWidth>
                    Grant Access
                  </Button>
                </Grid>
              </Grid>
            </form>
          )}

          {/* TAB 2: View Roles Table */}
          {value === 1 && (
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

              <Grid size={{ xs: 12 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: '#2c3e50' }}>
                      <TableRow>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Panel (Role)</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Mobile</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Department</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(filtered.length ? filtered : loginEmp)
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((e, index) => (
                          <TableRow key={index} hover>
                            <TableCell>{e.name}</TableCell>
                            <TableCell>{e.role}</TableCell>
                            <TableCell>{e.mobile}</TableCell>
                            <TableCell>{e.dep}</TableCell>
                            <TableCell>
                              <Button 
                                onClick={() => deleteT(e.eid)} 
                                variant="outlined" 
                                color="error" 
                                size="small"
                              >
                                Revoke
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
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
                </TableContainer>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// NEXT.JS MAGIC
RoleManagementPage.layout = 'dashboard';
RoleManagementPage.allowedRoles = ['admin'];