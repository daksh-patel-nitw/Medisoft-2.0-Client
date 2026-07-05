import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tabs,
  Tab,
  Autocomplete,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';
import { apis } from '../../services/commonServices';

// NOTE: Make sure these exist in your utils file!
import { 
  initialPatientState, 
  initialEmpState, 
  patientForm, 
  patLabels, 
  empForm, 
  empLabels 
} from '../../utils/registrationUtils'; // Adjust path as needed

// ==========================================
// COMPONENT 1: Custom Autocomplete
// ==========================================
const CAutocomp = React.memo(({ index, formValues, setFormValues, options }) => {
  const isRole = index === 13;
  const label = isRole ? "Role" : "Department";
  const name = isRole ? "role" : "dep";

  return (
    <Autocomplete
      options={options || []}
      fullWidth
      getOptionLabel={(option) => option?.label || option}
      value={options?.find(option => option === formValues[name]) || null}
      onChange={(event, newValue) => {
        setFormValues(prev => ({ ...prev, [name]: newValue }));
      }}
      renderInput={(params) => (
        <TextField required {...params} label={label} variant="outlined" size="small" />
      )}
    />
  );
});

// ==========================================
// COMPONENT 2: Extracted Registration Form
// ==========================================
const RegistrationForm = ({ 
  components, 
  labels, 
  formValues, 
  setFormValues, 
  handleSubmit, 
  tracker, 
  rolesDeps 
}) => {
  
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  return (
    <CardContent>
      <form onSubmit={(event) => handleSubmit(event, tracker, formValues)} autoComplete="off">
        <Grid container spacing={3}>
          {components.map((fieldName, index) => {
            
            // 1. Render Autocomplete for Roles (13) and Departments (14)
            if ([13, 14].includes(index)) {
              return (
                <Grid size={{ xs: 12, md: 4 }} key={fieldName}>
                  <CAutocomp
                    index={index}
                    setFormValues={setFormValues}
                    formValues={formValues}
                    options={rolesDeps?.[index % 13]} // Assumes rolesDeps is [[roles], [deps]]
                  />
                </Grid>
              );
            }

            // 2. Render Radio Group for Gender (Assumed index 4 based on your code)
            if (index === 4) {
              return (
                <Grid size={{ xs: 12, md: 4 }} key={fieldName}>
                  <Typography variant="caption" color="textSecondary">{labels[index]}</Typography>
                  <RadioGroup 
                    row 
                    name={fieldName} 
                    value={formValues[fieldName] || ''} 
                    onChange={handleInputChange}
                  >
                    <FormControlLabel value="M" control={<Radio required size="small" />} label="Male" />
                    <FormControlLabel value="F" control={<Radio required size="small" />} label="Female" />
                  </RadioGroup>
                </Grid>
              );
            }

            // 3. Render Standard Text/Number/Date Fields
            return (
              <Grid size={{ xs: 12, md: 4 }} key={fieldName}>
                <TextField
                  fullWidth
                  name={fieldName}
                  id={fieldName}
                  label={labels[index]}
                  variant="outlined"
                  size="small"
                  type={index === 3 ? 'date' : [5, 9].includes(index) ? 'number' : 'text'}
                  slotProps={index === 3 ? { inputLabel: { shrink: true } } : {}}
                  value={formValues[fieldName] || ''}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
            );
          })}
          
          <Grid size={{ xs: 12 }}>
            <Button type="submit" variant="contained" color="primary" size="large" sx={{ mt: 2 }}>
              Register {tracker === 1 ? "Patient" : "Employee"}
            </Button>
          </Grid>
        </Grid>
      </form>
    </CardContent>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function RegistrationPage() {
  const [value, setValue] = useState(0); // Tab state
  const [patValues, setPatValues] = useState(initialPatientState);
  const [empValues, setEmpValues] = useState(initialEmpState);
  const [rolesDeps, setRolesDeps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // // Fetch Roles & Departments for Employee tab
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const data = await apis.noTokengetRequest('/member/rolesDeps/all');
  //       setRolesDeps(data || []);
  //     } catch (error) {
  //       toast.error("Failed to load roles and departments");
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   fetchData();
  // }, []);

  const handleFormSubmit = async (event, tracker, formValues) => {
    event.preventDefault();

    try {
      const response = await apis.noTokenPostRequest('/member', formValues);
      if (response && response.id) {
        toast.success(`Registered Successfully! ID: ${response.id}`);
        
        // Reset the correct form
        if (tracker === 1) {
          setPatValues(initialPatientState);
        } else {
          setEmpValues(initialEmpState);
        }
      } else {
        toast.error('Registration failed. Please check details.');
      }
    } catch (error) {
      toast.error('Server error during registration.');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Registration Desk
      </Typography>

      <Card sx={{ boxShadow: 3 }}>
        <Tabs
          value={value}
          indicatorColor="primary"
          textColor="primary"
          onChange={(e, newValue) => setValue(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8f9fa' }}
        >
          <Tab label="Register Patient" sx={{ fontWeight: 'bold' }} />
          <Tab label="Register Employee" sx={{ fontWeight: 'bold' }} />
        </Tabs>

        {value === 0 ? (
          <RegistrationForm
            components={patientForm}
            labels={patLabels}
            formValues={patValues}
            setFormValues={setPatValues}
            handleSubmit={handleFormSubmit}
            tracker={1}
            rolesDeps={rolesDeps}
          />
        ) : (
          <RegistrationForm
            components={empForm}
            labels={empLabels}
            formValues={empValues}
            setFormValues={setEmpValues}
            handleSubmit={handleFormSubmit}
            tracker={2}
            rolesDeps={rolesDeps}
          />
        )}
      </Card>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
RegistrationPage.layout = 'dashboard';
RegistrationPage.allowedRoles = ['admin', 'receptionist']; // Adjust based on your roles