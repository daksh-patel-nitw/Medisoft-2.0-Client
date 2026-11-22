import { Box, Divider, Button } from '@mui/material';

/**
 * The bottom action of a card: a rule (hr), then one tall, full-width, bold
 * button. Use it for every card whose main button sits at the bottom (save,
 * add, grant access, ...) so they all look the same.
 *
 * `mt: 'auto'` pushes it to the bottom when the card is a flex column taller
 * than its content; `pt` keeps a minimum gap above the rule otherwise.
 *
 * @param {'button'|'submit'} [type]
 * @param {string} [color]
 * Any other Button prop (onClick, disabled, ...) is passed through.
 */
export default function CardActionButton({ children, type = 'button', color = 'primary', sx, ...rest }) {
  return (
    <Box sx={{ mt: 'auto', pt: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Button
        type={type}
        variant="contained"
        color={color}
        fullWidth
        size="large"
        sx={{ py: 1.5, fontWeight: 'bold', fontSize: '1rem', ...sx }}
        {...rest}
      >
        {children}
      </Button>
    </Box>
  );
}
