import React, { useState } from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { apis } from '../../services/commonServices';
import LabTestForm, { EMPTY_LAB_TEST, validateLabTest, toLabPayload } from '../../components/LabTestForm';
import CardActionButton from '../../components/CardActionButton';
import { PAGE_ACCESS } from '../../utils/pageAccess';

export default function AddLabTestPage() {
  const [values, setValues] = useState(EMPTY_LAB_TEST);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateLabTest(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      // The server answers with its own success message (shown as a toast).
      await apis.postRequest('/laboratory', toLabPayload(values));
      setValues(EMPTY_LAB_TEST);
    } catch (error) {
      // Already toasted by the http client; keep the form so nothing is lost.
    }
  };

  return (
    // The original card, centered, a little wider than before (800px instead of
    // ~600px) so the From/To time pickers aren't squeezed. No top margin, so it
    // sits right under the breadcrumb.
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        noValidate
        style={{ width: '100%', maxWidth: 800, height: '100%', display: 'flex' }}
      >
        <Card sx={{ width: '100%', boxShadow: 3, display: 'flex', flexDirection: 'column', minHeight: 520 }}>
          <CardContent sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              Add New Test Profile
            </Typography>

            <LabTestForm
              values={values}
              onChange={(next) => {
                setValues(next);
                setErrors({});
              }}
              errors={errors}
            />
          </CardContent>

          <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column' }}>
            <CardActionButton type="submit">Save New Test</CardActionButton>
          </Box>
        </Card>
      </form>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
AddLabTestPage.layout = 'dashboard';
AddLabTestPage.requiredPermissions = PAGE_ACCESS.labNewTest;
