import { Box, Typography } from '@mui/material';

// Narrow strip shown at the end of every page (dashboard pages, login,
// the public landing page, ...). `position: sticky; bottom: 0` makes it sit
// at the end of the page when the content is long, and stay at the bottom of
// the screen when the page is short - so it is always visible.
export default function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 1,
        flexShrink: 0,
        py: 0.5,
        px: 2,
        textAlign: 'center',
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        © {new Date().getFullYear()} MediSoft. All rights reserved.
      </Typography>
    </Box>
  );
}
