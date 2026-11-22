import { useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, FormControlLabel, Checkbox, Chip, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PERMISSION_MODULES, MODULE_LABELS } from '../utils/permissions.util';

// Permissions as one collapsible row per module, e.g. "Admin 14/14", so every
// module is visible at once as a compact summary and only the ones you're
// working on are opened. Several rows can be open together. The open/closed
// state lives here, and this component stays mounted while the parent swaps
// between roles, so the same module stays open as you click through roles
// (handy for comparing one module across roles).
//
// `value` is the flat list of checked permission keys (e.g. ['viewRoles',
// 'createRole']); onChange receives the next list. `readOnly` shows the same
// rows with every checkbox disabled (viewing a role).
export default function PermissionPicker({ value = [], onChange, readOnly = false }) {
  const selected = new Set(value);
  const [openModules, setOpenModules] = useState(() => new Set());

  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  const toggleModule = (codes, allSelected) => {
    const next = new Set(selected);
    codes.forEach(({ key }) => {
      if (allSelected) next.delete(key);
      else next.add(key);
    });
    onChange(Array.from(next));
  };

  const toggleOpen = (prefix) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  };

  return (
    // A gap between the rows: each module is its own bordered row, not stacked flush against the next one.
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Object.entries(PERMISSION_MODULES).map(([prefix, codes]) => {
        const selectedCount = codes.filter((c) => selected.has(c.key)).length;
        const allSelected = selectedCount === codes.length;

        return (
          <Accordion
            key={prefix}
            disableGutters
            variant="outlined"
            sx={{ borderRadius: 1, '&::before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}
            expanded={openModules.has(prefix)}
            onChange={() => toggleOpen(prefix)}
            slotProps={{ transition: { unmountOnExit: true } }}
          >
            {/* Thin summary: 40px tall instead of MUI's 48/64px. */}
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                minHeight: 40,
                px: 1.5,
                '&.Mui-expanded': { minHeight: 40 },
                '& .MuiAccordionSummary-content': { my: 0, alignItems: 'center' },
                '& .MuiAccordionSummary-content.Mui-expanded': { my: 0 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                <FormControlLabel
                  sx={{ m: 0 }}
                  // Clicking the module checkbox must not also open/close the row.
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  control={
                    <Checkbox
                      size="small"
                      sx={{ p: 0.5 }}
                      checked={allSelected}
                      indeterminate={selectedCount > 0 && !allSelected}
                      disabled={readOnly}
                      onChange={() => toggleModule(codes, allSelected)}
                    />
                  }
                  label={<strong>{MODULE_LABELS[prefix]}</strong>}
                />
                <Chip size="small" sx={{ height: 20 }} label={`${selectedCount}/${codes.length}`} color={selectedCount === 0 ? 'default' : 'primary'} variant={selectedCount === 0 ? 'outlined' : 'filled'} />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0.5, pb: 1, px: 2 }}>
              {/* Two columns for the long modules (Admin, Room), one for short ones. */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: codes.length > 6 ? '1fr 1fr' : '1fr' }, columnGap: 2 }}>
                {codes.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox size="small" checked={selected.has(key)} disabled={readOnly} onChange={() => toggle(key)} />
                    }
                    label={label}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
