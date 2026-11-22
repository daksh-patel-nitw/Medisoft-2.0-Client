import { TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

/**
 * The app's search box: a small outlined field with a search icon and a cross
 * that clears the text (shown only while there is text). Use this for every
 * search bar so they all behave the same.
 *
 * @param {string} value
 * @param {(text: string) => void} onChange - called with the new text; the cross calls it with ''
 * Any other TextField prop (label, placeholder, error, helperText, sx, ...) is passed through.
 */
export default function SearchField({ value, onChange, slotProps, ...rest }) {
  return (
    <TextField
      size="small"
      fullWidth
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        ...slotProps,
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => onChange('')}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
          ...slotProps?.input,
        },
      }}
    />
  );
}
