import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { AMENITIES } from './RoomCategoryForm';

/**
 * A room category's details: price per day and every amenity with a tick or a
 * cross, plus any other amenities. Used under each accordion on the manage
 * tab, and beside the "add room" form when a category is chosen.
 *
 * @param {{name?, pricePerDay, sofa, tv, refrigator, bathroom, ac, other?}} category
 * @param {boolean} [showTitle] - also show the category name and price as a heading
 */
export default function RoomCategoryDetails({ category, showTitle = false }) {
  return (
    <Box>
      {showTitle && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="h6" fontWeight="bold">
            {category.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ₹{Number(category.pricePerDay).toFixed(2)} per day
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1 }}>
        {AMENITIES.map(({ key, label }) => {
          const has = category[key] === 'Y';
          return (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: has ? 'text.primary' : 'text.disabled' }}>
              {has ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="disabled" fontSize="small" />}
              <Typography variant="body2">{label}</Typography>
            </Box>
          );
        })}
      </Box>

      {category.other && (
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          <strong>Other:</strong> {category.other}
        </Typography>
      )}
    </Box>
  );
}
