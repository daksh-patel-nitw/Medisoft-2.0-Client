import { useState } from 'react';
import {
  Card, Typography, Box, Divider, TextField, IconButton, Chip, Button, ToggleButtonGroup, ToggleButton,
  List, ListItemButton, ListItemText, Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { PERMISSION_MODULES, decodeToFlags } from '../utils/permissions.util';
import PermissionPicker from './PermissionPicker';
import SearchField from './SearchField';
import CardActionButton from './CardActionButton';

// Letters and spaces only - mirrors the backend's v_string_letters_space.
const NAME_PATTERN = /^[\p{L}\p{M}\s]+$/u;
// The seeded Admin role always has full access and is never edited (see admin.service.ts on the server).
const ADMIN_ROLE_NAME = 'Admin';

// `encodedPermissions` is the per-module bit-string object ({ A: "1111...(32)", ... })
// a role carries; only the first `codes.length` bits of each string are real
// permissions, the rest is zero padding.
function permissionSummary(encodedPermissions = {}) {
  let granted = 0;
  let total = 0;
  for (const [prefix, bits] of Object.entries(encodedPermissions)) {
    const codes = PERMISSION_MODULES[prefix.toUpperCase()];
    if (!codes || typeof bits !== 'string') continue;
    granted += bits.slice(0, codes.length).split('').filter((b) => b === '1').length;
    total += codes.length;
  }
  return { granted, total };
}

/**
 * Master-detail roles view: the role list on the left (~30%), the selected
 * role's permissions on the right (~70%), so admins can click from role to
 * role without leaving the screen.
 *
 *  Left : Custom / Default pill toggle, search, compact role list with
 *         permission-count badges, "+ New role" (custom tab).
 *  Right: role name, Edit / Save (+ Delete) for custom roles, permissions as
 *         a two-column grid of module cards. Default (`builtIn`) roles can have
 *         their permissions edited (not renamed or deleted) - except Admin,
 *         which is view-only.
 *
 * @param {Array}  roles       [{ id, name, permissions, builtIn }]
 * @param {boolean} canCreate/canUpdate/canDelete - from the viewer's own permission flags
 * @param {(role: {id?: string, name: string, flags: string[]}) => Promise<object|null>} onSave
 *        create (no id) or update; resolves the saved role, or null if the server rejected it
 * @param {(role) => void} onDelete - asks the page to confirm and delete
 */
export default function RolesCard({ roles, canCreate, canUpdate, canDelete, onSave, onDelete }) {
  const [tab, setTab] = useState('custom');
  const [searchVal, setSearchVal] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'create'
  const [draftName, setDraftName] = useState('');
  const [draftFlags, setDraftFlags] = useState([]);

  const isDefaultTab = tab === 'default';
  const tabRoles = roles.filter((r) => Boolean(r.builtIn) === isDefaultTab);
  const visibleRoles = tabRoles.filter((r) => r.name.toLowerCase().includes(searchVal.toLowerCase()));

  // Selection is derived, not synced by effects: if nothing valid is
  // selected (first load, tab switch, the role was just deleted), fall back
  // to the first role in the list.
  const selected = visibleRoles.find((r) => r.id === selectedId) ?? visibleRoles[0] ?? null;

  const isEditing = mode === 'edit' || mode === 'create';
  const trimmedName = draftName.trim();
  // A default role keeps its name (the server finds it by name), so its name is not editable or validated.
  const editingDefaultRole = mode === 'edit' && Boolean(selected?.builtIn);
  const isNameValid = editingDefaultRole || (trimmedName.length > 0 && NAME_PATTERN.test(trimmedName));
  const isAdminRole = Boolean(selected?.builtIn) && selected.name === ADMIN_ROLE_NAME;
  const canSubmit = isNameValid && draftFlags.length > 0;

  const cancelEditing = () => setMode('view');

  const handleSelect = (role) => {
    setSelectedId(role.id);
    setMode('view'); // switching roles discards any unsaved draft
  };

  const handleTabChange = (_event, next) => {
    if (!next) return; // ToggleButtonGroup reports null when the active pill is clicked again
    setTab(next);
    setSearchVal('');
    setSelectedId(null);
    setMode('view');
  };

  const startCreate = () => {
    setDraftName('');
    setDraftFlags([]);
    setMode('create');
  };

  const startEdit = () => {
    setDraftName(selected.name);
    setDraftFlags(Array.from(decodeToFlags(selected.permissions)));
    setMode('edit');
  };

  const handleSave = async () => {
    if (!canSubmit) return;
    // onSave resolves null on a server rejection (duplicate name, ...; already
    // toasted) - stay in the editor so the input isn't lost.
    const saved = await onSave({ id: mode === 'edit' ? selected.id : undefined, name: trimmedName, flags: draftFlags });
    if (saved) {
      setSelectedId(saved.id);
      setMode('view');
    }
  };

  return (
    // Two separate cards with a thin gap: the role list, and the selected role's permissions.
    // Side by side on md+, stacked on phones (so each is easy to view on its own).
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, height: { md: '100%' }, minHeight: 480 }}>
      {/* ---------- LEFT: role list ---------- */}
      {/* The panel is `position: relative` and its content `position: absolute` (inset 0) on md+:
          the list's length then can't make the card taller than the page - the card is exactly
          the height the layout gives it, and the list scrolls inside it. On phones it flows normally. */}
      <Card sx={{ flex: { md: '0 0 30%' }, minWidth: 0, position: { md: 'relative' }, boxShadow: 3, overflow: 'hidden' }}>
        <Box sx={{ position: { md: 'absolute' }, inset: { md: 0 }, display: 'flex', flexDirection: 'column', p: 2 }}>
        <ToggleButtonGroup value={tab} exclusive onChange={handleTabChange} size="small" fullWidth sx={{ mb: 2 }}>
          <ToggleButton value="custom">Custom</ToggleButton>
          <ToggleButton value="default">Default</ToggleButton>
        </ToggleButtonGroup>

        <SearchField
          label="Search roles..."
          value={searchVal}
          onChange={setSearchVal}
          sx={{ mb: 1 }}
        />

        {/* overflowY 'scroll' (not 'auto'): the scrollbar track is always there on the right, empty when nothing needs scrolling. On phones the list is capped so the permissions card stays reachable. */}
        <List dense sx={{ flexGrow: 1, minHeight: 0, overflowY: 'scroll', maxHeight: { xs: 320, md: 'none' } }}>
          {visibleRoles.map((r) => {
            const { granted, total } = permissionSummary(r.permissions);
            return (
              <ListItemButton
                key={r.id}
                selected={selected?.id === r.id && mode !== 'create'}
                onClick={() => handleSelect(r)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText primary={r.name} primaryTypographyProps={{ fontWeight: 500, noWrap: true }} />
                <Chip size="small" label={`${granted}/${total}`} />
              </ListItemButton>
            );
          })}
          {visibleRoles.length === 0 && (
            <Typography color="text.secondary" align="center" variant="body2" sx={{ mt: 3 }}>
              {isDefaultTab ? 'No default roles found.' : 'No custom roles yet.'}
            </Typography>
          )}
        </List>

        {canCreate && !isDefaultTab && (
          <CardActionButton startIcon={<AddIcon />} onClick={startCreate} disabled={mode === 'create'}>
            New role
          </CardActionButton>
        )}
        </Box>
      </Card>

      {/* ---------- RIGHT: selected role's permissions ---------- */}
      <Card sx={{ flex: 1, minWidth: 0, minHeight: { xs: 240 }, position: { md: 'relative' }, boxShadow: 3, overflow: 'hidden' }}>
        <Box sx={{ position: { md: 'absolute' }, inset: { md: 0 }, display: 'flex', flexDirection: 'column', p: 2 }}>
        {mode === 'create' || selected ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1, minHeight: 48 }}>
              {isEditing ? (
                <TextField
                  label="Role name"
                  size="small"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  error={draftName.length > 0 && !isNameValid}
                  helperText={editingDefaultRole ? 'Default roles keep their name' : draftName.length > 0 && !isNameValid ? 'Letters and spaces only' : ' '}
                  disabled={editingDefaultRole}
                  autoFocus
                  sx={{ maxWidth: 360, flexGrow: 1 }}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Typography variant="h6" fontWeight="bold" noWrap>{selected.name}</Typography>
                  {selected.builtIn && <Chip size="small" color="primary" variant="outlined" label={isAdminRole ? 'Default - view only' : 'Default'} />}
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                {isEditing ? (
                  <>
                    <Button onClick={cancelEditing}>Cancel</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!canSubmit}>
                      Save
                    </Button>
                  </>
                ) : (
                  !isAdminRole && (
                    <>
                      {canUpdate && (
                        <Button variant="outlined" startIcon={<EditIcon />} onClick={startEdit}>
                          Edit
                        </Button>
                      )}
                      {canDelete && !selected.builtIn && (
                        <Tooltip title="Delete role">
                          <IconButton color="secondary" onClick={() => onDelete(selected)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )
                )}
              </Box>
            </Box>

            <Divider />

            {/* pt: the rows start a little below the line, not on it */}
            <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'scroll', pr: 1, pt: 2 }}>
              {isEditing ? (
                <PermissionPicker value={draftFlags} onChange={setDraftFlags} />
              ) : (
                <PermissionPicker value={Array.from(decodeToFlags(selected.permissions))} readOnly />
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Select a role to see its permissions.</Typography>
          </Box>
        )}
        </Box>
      </Card>
    </Box>
  );
}
