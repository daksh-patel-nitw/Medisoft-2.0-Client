import React, { useState, useEffect, memo } from "react";
import { Grid2, Card, CardContent, TextField, Autocomplete, Button, Typography, Box } from "@mui/material";
import { toast } from "react-toastify";
import { apis } from "../../services/commonServices"; 
import { initialMedicineState, checkNewMedicine, arr1, arr2 } from '../../utils/pharmacyUtils'; 

// ==========================================
// COMPONENT 1: The Category/Type Manager (Memoized)
// ==========================================
const CategoryForm = memo(({ typeValues, updateValues }) => {
  const [category, setType] = useState('');
  const [categoryDelete, setDeleteType] = useState('');

  const handleInputChange = (event, newValue) => {
    const { value, name } = event.target;
    name === 'category' ? setType(value) : setDeleteType(newValue);
  };

  const handleSubmit = async (flag) => {
    if (flag && !category) {
      toast.error("Please enter a category");
      return;
    }
    const updated = flag ? [category, ...typeValues] : typeValues.filter(type => type !== categoryDelete);
    const data = { value: flag ? category : categoryDelete, flag };
    
    const status = await apis.noTokenStatusPostRequest('/pharmacy/types', data);
    if (status === 200) {
      flag ? setType('') : setDeleteType('');
      updateValues(updated);
    }
  };

  return (
    <Grid2 container spacing={2} size={{ xs: 12 }}>
      {/* Add Category Card */}
      <Card sx={{ width: '100%', mb: 2 }}>
        <CardContent>
          <Grid2 container spacing={2} alignItems="center">
            <Grid2 size={{ xs: 12 }}>
              <Typography variant="h6">Add Medicine Category</Typography>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 8 }}>
              <TextField
                name="category"
                label="New Category Name"
                value={category}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                size="small"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <Button onClick={() => handleSubmit(1)} variant="contained" color="primary" fullWidth>
                Add Category
              </Button>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Delete Category Card */}
      <Card sx={{ width: '100%' }}>
        <CardContent>
          <Grid2 container spacing={2} alignItems="center">
            <Grid2 size={{ xs: 12 }}>
              <Typography variant="h6">Delete Medicine Category</Typography>
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 8 }}>
              <Autocomplete
                options={Array.isArray(typeValues) ? typeValues : []}
                name="categoryDelete"
                onChange={(event, newValue) => handleInputChange(event, newValue)}
                value={categoryDelete}
                size="small"
                renderInput={(params) => <TextField fullWidth {...params} label="Search Category" />}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <Button 
                onClick={() => handleSubmit(0)} 
                variant="contained" 
                color="error" 
                fullWidth 
                disabled={!categoryDelete}
              >
                Delete
              </Button>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>
    </Grid2>
  );
});

// ==========================================
// COMPONENT 2: The Main Add Medicine Form (Memoized)
// ==========================================
const AddMedicineForm = memo(({ formValues, handleInputChange, handleSubmit, allCategory, searchValue, searchVal }) => {
  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} autoComplete="off">
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12 }}>
              <Typography variant="h6">Add New Medicine</Typography>
            </Grid2>
            
            {arr1.map((fieldName, index) => (
              index === 2 ? (
                <Grid2 size={{ xs: 12 }} key={fieldName}>
                  <Autocomplete
                    options={allCategory}
                    onChange={(event, newValue) => searchValue(newValue)}
                    value={searchVal}
                    size="small"
                    renderInput={(params) => <TextField fullWidth {...params} label="Select Category Type" />}
                  />
                </Grid2>
              ) : (
                <Grid2 size={{ xs: [5].includes(index) ? 12 : 6 }} key={fieldName}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    name={fieldName}
                    label={arr2[index]}
                    type={[3, 4, 5].includes(index) ? "number" : "text"}
                    value={formValues[fieldName]}
                    onChange={handleInputChange}
                  />
                </Grid2>
              )
            ))}
            
            <Grid2 size={{ xs: 12 }}>
              <Button type="submit" variant="contained" color="success" fullWidth sx={{ mt: 2 }}>
                Save Medicine to Inventory
              </Button>
            </Grid2>
          </Grid2>
        </form>
      </CardContent>
    </Card>
  );
});

// ==========================================
// COMPONENT 3: The Main Page Export
// ==========================================
export default function NewMedicinePage() {
  const [formValues, setFormValues] = useState(initialMedicineState);
  const [allCategory, setCategory] = useState([]);
  const [searchVal, setSearchVal] = useState('');

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const searchValue = (newValue) => {
    setSearchVal(newValue);
    setFormValues(prev => ({ ...prev, t: newValue }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apis.noTokengetRequest('/pharmacy/types');
        setCategory(data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (checkNewMedicine(formValues)) {
      try {
        await apis.noTokenPostRequest('/pharmacy', formValues);
        setFormValues(initialMedicineState);
        setSearchVal('');
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Pharmacy Inventory Management
      </Typography>
      
      <Grid2 container spacing={4} sx={{ mt: 2 }}>
        {/* Left Side: Add Medicine */}
        <Grid2 size={{ xs: 12, md: 7 }}>
          <AddMedicineForm
            formValues={formValues}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            allCategory={allCategory}
            searchValue={searchValue}
            searchVal={searchVal}
          />
        </Grid2>

        {/* Right Side: Manage Categories */}
        <Grid2 size={{ xs: 12, md: 5 }}>
          <CategoryForm 
            typeValues={allCategory} 
            updateValues={setCategory} 
          />
        </Grid2>
      </Grid2>
    </Box>
  );
}

// Next.js Security & Layout Flags
NewMedicinePage.layout = 'dashboard';
NewMedicinePage.allowedRoles = ['admin', 'pharmacist'];