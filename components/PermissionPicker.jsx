import Grid from '@mui/material/Grid2';
import { Accordion, AccordionSummary, AccordionDetails, FormControlLabel, Checkbox } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PERMISSION_MODULES, MODULE_LABELS } from '../utils/permissions.util';

// Checkbox grid for a role's permissions, grouped into one collapsible
// section per module. `value` is the flat list of checked permission keys
// (e.g. ['viewRoles', 'createRole']); onChange receives the next list.
export default function PermissionPicker({ value = [], onChange }) {
  const selected = new Set(value);

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

  return (
    <div>
      {Object.entries(PERMISSION_MODULES).map(([prefix, codes]) => {
        const selectedCount = codes.filter((c) => selected.has(c.key)).length;
        const allSelected = selectedCount === codes.length;

        return (
          <Accordion key={prefix} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormControlLabel
                onClick={(e) => e.stopPropagation()}
                control={
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selectedCount > 0 && !allSelected}
                    onChange={() => toggleModule(codes, allSelected)}
                  />
                }
                label={`${MODULE_LABELS[prefix]} (${selectedCount}/${codes.length})`}
              />
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1}>
                {codes.map(({ key, label }) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={key}>
                    <FormControlLabel
                      control={
                        <Checkbox size="small" checked={selected.has(key)} onChange={() => toggle(key)} />
                      }
                      label={label}
                    />
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </div>
  );
}
