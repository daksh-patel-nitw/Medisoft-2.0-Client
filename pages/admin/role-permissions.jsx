import React, { useState, useEffect, useMemo } from 'react';
import { Box, Card, CardContent, Skeleton } from '@mui/material';
import { apis } from '../../services/commonServices';
import useRefreshStore from '../../store/useRefreshStore';
import { decodeToFlags, encodeFlags } from '../../utils/permissions.util';
import RolesCard from '../../components/RolesCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import { PAGE_ACCESS } from '../../utils/pageAccess';

export default function RolePermissionsPage({ currentUser }) {
  const [roles, setRoles] = useState([]); // [{ id, name, permissions: { A: '<32 bits>', ... }, builtIn }]
  const [isLoading, setIsLoading] = useState(true);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const refreshTick = useRefreshStore((state) => state.refreshTick);
  const finishRefresh = useRefreshStore((state) => state.finishRefresh);

  // Decoded once per currentUser change, reused for every show/hide check.
  const flags = useMemo(() => decodeToFlags(currentUser?.permissions), [currentUser?.permissions]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setIsLoading(true);
        const roleData = await apis.getRequest('/admin/roles');
        setRoles(roleData || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
        finishRefresh();
      }
    };
    fetchRoles();
  }, [refreshTick]);

  // Create (no id) or update. The role's id is Mongo's own _id, so the saved
  // {id, name, permissions, builtIn} always comes from the response body -
  // never rebuilt locally. Resolves the saved role; a rejection (duplicate
  // name, ...) is already toasted by the http client, and returning null
  // keeps the editor open so the input isn't lost. The progress overlay for
  // the request comes from the http client too.
  const handleSave = async ({ id, name, flags: pickedFlags }) => {
    const permissions = encodeFlags(pickedFlags);
    try {
      if (id) {
        const saved = await apis.putRequest(`/admin/roles/${encodeURIComponent(id)}`, { name, permissions });
        setRoles((prev) => prev.map((r) => (r.id === id ? saved : r)));
        return saved;
      }
      const created = await apis.postRequest('/admin/roles', { name, permissions });
      setRoles((prev) => [...prev, created]);
      return created;
    } catch (error) {
      return null;
    }
  };

  const confirmDelete = async () => {
    const { id } = roleToDelete;
    setRoleToDelete(null);
    try {
      await apis.deleteRequest(`/admin/roles/${encodeURIComponent(id)}`);
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      // Role still assigned to an account: backend returns 400 with a
      // message, already toasted globally.
    }
  };

  return (
    <Box sx={{ height: '100%' }}>
      {isLoading ? (
        // Mirrors the real layout: two separate cards with a thin gap - the role list, and the permission rows.
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, height: '100%', minHeight: 480 }}>
          <Card sx={{ flex: { md: '0 0 30%' }, boxShadow: 3 }}>
            <CardContent>
              <Skeleton variant="rectangular" height={38} sx={{ mb: 2, borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={40} sx={{ mb: 2, borderRadius: 1 }} />
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </CardContent>
          </Card>
          <Card sx={{ flex: 1, boxShadow: 3 }}>
            <CardContent>
              <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </CardContent>
          </Card>
        </Box>
      ) : (
        <RolesCard
          roles={roles}
          canCreate={flags.has('createRole')}
          canUpdate={flags.has('updateRole')}
          canDelete={flags.has('deleteRole')}
          onSave={handleSave}
          onDelete={setRoleToDelete}
        />
      )}

      <ConfirmDialog
        open={Boolean(roleToDelete)}
        message={`Are you sure you want to delete the role "${roleToDelete?.name ?? ''}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setRoleToDelete(null)}
      />
    </Box>
  );
}

// NEXT.JS SECURITY GATE
RolePermissionsPage.layout = 'dashboard';
RolePermissionsPage.requiredPermissions = PAGE_ACCESS.rolePermissions;
