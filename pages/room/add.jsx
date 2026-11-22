import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, Skeleton } from '@mui/material';
import { apis } from '../../services/commonServices';
import RoomForm, { EMPTY_ROOM, validateRoom, toRoomPayload } from '../../components/RoomForm';
import CardActionButton from '../../components/CardActionButton';
import { PAGE_ACCESS } from '../../utils/pageAccess';

export default function AddRoomPage() {
  const [categories, setCategories] = useState(null); // null = still loading
  const [values, setValues] = useState(EMPTY_ROOM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apis.getRequest('/room/category');
        if (!cancelled) setCategories(data || []);
      } catch (error) {
        if (!cancelled) setCategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const found = validateRoom(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await apis.postRequest('/room', toRoomPayload(values));
      setValues(EMPTY_ROOM);
    } catch (error) {
      // Already toasted by the http client (e.g. the room already exists); keep the form.
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <form onSubmit={submit} autoComplete="off" noValidate style={{ width: '100%', maxWidth: 1000, height: '100%', display: 'flex' }}>
        <Card sx={{ width: '100%', boxShadow: 3, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          <CardContent sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* pt: room for the outlined fields' floating labels */}
            <Box sx={{ pt: 1 }}>
              {categories === null ? (
                <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1 }} />
              ) : (
                <RoomForm
                  values={values}
                  onChange={(next) => {
                    setValues(next);
                    setErrors({});
                  }}
                  categories={categories}
                  errors={errors}
                />
              )}
            </Box>
          </CardContent>

          <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column' }}>
            <CardActionButton type="submit">Add room</CardActionButton>
          </Box>
        </Card>
      </form>
    </Box>
  );
}

// NEXT.JS SECURITY GATE
AddRoomPage.layout = 'dashboard';
AddRoomPage.requiredPermissions = PAGE_ACCESS.roomAdd;
