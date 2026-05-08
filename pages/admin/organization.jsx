import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Grid from '@mui/material/Grid2';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DomainIcon from '@mui/icons-material/Domain';
import { apis } from '../../Services/commonServices';

// ==========================================
// COMPONENT: Reusable Card for Roles & Departments
// ==========================================
const ManageListCard = ({ title, items, inputValue, onInputChange, onAdd, onDelete, onSave }) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Manage {title}
        </Typography>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); onSave(); }} 
          autoComplete="off"
        >
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid size={{ xs: 8 }}>
              <TextField
                label={`Add New ${title}`}
                fullWidth
                variant="outlined"
                size="small"
                value={inputValue}
                onChange={onInputChange}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={onAdd}
                disabled={!inputValue.trim()}
              >
                Add
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* Scrollable List Container */}
          <Box sx={{ height: '40vh', overflowY: 'auto', mb: 2, pr: 1 }}>
            {items.map((item, idx) => (
              <Box 
                key={idx} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  p: 1,
                  mb: 1,
                  bgcolor: '#f8f9fa',
                  borderRadius: 1
                }}
              >
                <Typography variant="body1" fontWeight="500">
                  {item}
                </Typography>
                <IconButton color="error" onClick={() => onDelete(item)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            {items.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                No {title.toLowerCase()} found.
              </Typography>
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="success"
            fullWidth
            sx={{ mt: 'auto' }} // Pushes save button to the bottom
          >
            Save Changes to Database
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function OrganizationPage() {
  // We keep the array of arrays structure [[roles], [deps]] to match your backend API
  const [dataLists, setDataLists] = useState([[], []]); 
  
  // Inputs for the text fields
  const [inputs, setInputs] = useState({ role: '', dep: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all roles and departments
  const fetchData = async () => {
    try {
      const data = await apis.noTokengetRequest('/member/rolesDeps/all');
      setDataLists(data || [[], []]);
    } catch (error) {
      toast.error("Failed to fetch organization data.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Input Text Changes
  const handleInputChange = (index, event) => {
    if (index === 0) {
      setInputs(prev => ({ ...prev, role: event.target.value }));
    } else {
      setInputs(prev => ({ ...prev, dep: event.target.value }));
    }
  };

  // Handle Adding and Deleting from the local UI state
  const handleUpdate = (index, actionType, itemValue = null) => {
    const newDataLists = [...dataLists];
    const currentList = newDataLists[index] || [];

    if (actionType === 'DELETE') {
      newDataLists[index] = currentList.filter(e => e !== itemValue);
    } 
    else if (actionType === 'ADD') {
      const valToAdd = index === 0 ? inputs.role.trim() : inputs.dep.trim();
      
      if (!valToAdd) return;
      
      if (!currentList.includes(valToAdd)) {
        newDataLists[index] = [...currentList, valToAdd];
      } else {
        toast.warn("This item already exists!");
      }
    }

    setDataLists(newDataLists);
    
    // Clear inputs after adding
    if (actionType === 'ADD') {
      setInputs({ role: '', dep: '' });
    }
  };

  // Handle Saving to the Backend API
  const handleSave = async (index) => {
    const nameStr = index === 0 ? 'roles' : 'dep';
    const payloadData = dataLists[index];

    try {
      await apis.noTokenPostRequest('/member/roleDeps', { 
        name: nameStr, 
        data: payloadData 
      });
      toast.success(`${index === 0 ? 'Roles' : 'Departments'} saved successfully!`);
    } catch (error) {
      toast.error("Failed to save changes.");
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
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <DomainIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h4" fontWeight="bold">
          Organization Setup
        </Typography>
      </Box>

      <Grid container spacing={4} alignItems="stretch">
        
        {/* ROLES CARD (Index 0) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <ManageListCard
            title="Roles"
            items={dataLists[0] || []}
            inputValue={inputs.role}
            onInputChange={(e) => handleInputChange(0, e)}
            onAdd={() => handleUpdate(0, 'ADD')}
            onDelete={(item) => handleUpdate(0, 'DELETE', item)}
            onSave={() => handleSave(0)}
          />
        </Grid>

        {/* DEPARTMENTS CARD (Index 1) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <ManageListCard
            title="Departments"
            items={dataLists[1] || []}
            inputValue={inputs.dep}
            onInputChange={(e) => handleInputChange(1, e)}
            onAdd={() => handleUpdate(1, 'ADD')}
            onDelete={(item) => handleUpdate(1, 'DELETE', item)}
            onSave={() => handleSave(1)}
          />
        </Grid>

      </Grid>
    </Box>
  );
}

// NEXT.JS MAGIC
OrganizationPage.layout = 'dashboard';
OrganizationPage.allowedRoles = ['admin'];