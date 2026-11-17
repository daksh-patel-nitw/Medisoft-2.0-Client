import { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import MedicationIcon from '@mui/icons-material/Medication';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';

// Stethoscope, heart, injection, capsule, blood drop - cycled one at a time.
const ICONS = [MedicalServicesIcon, FavoriteIcon, VaccinesIcon, MedicationIcon, BloodtypeIcon];

const iconCycle = keyframes`
  0% { opacity: 0; transform: scale(0.4) rotate(-10deg); }
  18% { opacity: 1; transform: scale(1) rotate(0deg); }
  78% { opacity: 1; transform: scale(1) rotate(0deg); }
  100% { opacity: 0; transform: scale(0.6) rotate(10deg); }
`;

/**
 * Full-page loading overlay for any async action (login, saving,
 * submitting...): one medical icon at a time, fading/scaling in then out,
 * cycling through the set. Mount it anywhere - `position: fixed` covers the
 * whole viewport regardless of where it sits in the tree, not just its
 * parent. Purely decorative/presentational.
 *
 * @param {boolean} [open] - renders nothing when false
 * @param {string} [label] - optional caption under the icon
 * @param {number} [intervalMs] - how long each icon is shown, in ms
 * @param {number} [iconSize] - icon font size in px
 */
export default function MedicalProgressBar({ open = true, label, intervalMs = 900, iconSize = 96 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % ICONS.length), intervalMs);
    return () => clearInterval(id);
  }, [open, intervalMs]);

  if (!open) return null;

  const Icon = ICONS[index];

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(255, 255, 255, 0.92)',
        zIndex: (theme) => theme.zIndex.modal + 1,
      }}
    >
      <Icon
        key={index}
        color="primary"
        sx={{
          fontSize: iconSize,
          animation: `${iconCycle} ${intervalMs}ms ease-in-out`,
        }}
      />
      {label && (
        <Typography color="text.secondary" variant="body1" sx={{ mt: 3 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
