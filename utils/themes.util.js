import { createTheme } from '@mui/material/styles';

// Error/warning/info/success stay IDENTICAL across every theme below. A red
// alert must always mean "error" and nothing else - letting a role's brand
// color bleed into semantic colors would make the UI unreadable (e.g. a
// green-brand role showing a "green" error chip that looks like success).
const SEMANTIC_PALETTE = {
  error: { main: '#D32F2F', light: '#EF5350', dark: '#B71C1C' },
  warning: { main: '#ED6C02', light: '#FF9800', dark: '#C77700' },
  info: { main: '#0288D1', light: '#03A9F4', dark: '#01579B' },
  success: { main: '#2E7D32', light: '#4CAF50', dark: '#1B5E20' },
};

// Typography/shape/component defaults shared by every theme, so switching
// theme only ever changes color, never layout or type scale. 'Inter' is not
// loaded by this app (MUI ships Roboto); it's listed first purely so it's
// picked up automatically if you later add the Google Font link - until
// then it just falls through to Roboto in the stack, no breakage.
const SHARED_THEME_OPTIONS = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
  },
};

// Five professional, healthcare-appropriate palettes. Only primary/secondary/
// background differ between them - pick distinct hues per role so staff can
// tell at a glance which screen/account they're in.
export const THEME_PALETTES = {
  clinicalBlue: {
    label: 'Clinical Blue',
    primary: { main: '#0B5ED7', light: '#4C8DF0', dark: '#063C8F' },
    secondary: { main: '#00897B', light: '#4DB6AC', dark: '#00695C' },
    background: { default: '#F4F7FB', paper: '#FFFFFF' },
  },
  careTeal: {
    label: 'Care Teal',
    primary: { main: '#00796B', light: '#48A999', dark: '#004C40' },
    secondary: { main: '#3F51B5', light: '#7986CB', dark: '#283593' },
    background: { default: '#F2F8F7', paper: '#FFFFFF' },
  },
  vitalGreen: {
    label: 'Vital Green',
    primary: { main: '#2E7D32', light: '#60AD5E', dark: '#005005' },
    secondary: { main: '#EF6C00', light: '#FF9E40', dark: '#B53D00' },
    background: { default: '#F3F8F2', paper: '#FFFFFF' },
  },
  pharmaViolet: {
    label: 'Pharma Violet',
    primary: { main: '#5E35B1', light: '#8E67DE', dark: '#280680' },
    secondary: { main: '#00897B', light: '#4DB6AC', dark: '#00695C' },
    background: { default: '#F6F4FB', paper: '#FFFFFF' },
  },
  slateNeutral: {
    label: 'Slate Neutral',
    primary: { main: '#37474F', light: '#62727B', dark: '#102027' },
    secondary: { main: '#EF6C00', light: '#FF9E40', dark: '#B53D00' },
    background: { default: '#F5F6F7', paper: '#FFFFFF' },
  },
};

/**
 * Builds a full MUI theme for the given palette key, merging its
 * primary/secondary/background onto the fixed semantic colors and shared
 * typography/shape/component defaults above.
 */
export function createAppTheme(themeKey = 'clinicalBlue') {
  const palette = THEME_PALETTES[themeKey] || THEME_PALETTES.clinicalBlue;
  return createTheme({
    ...SHARED_THEME_OPTIONS,
    palette: {
      mode: 'light',
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
      ...SEMANTIC_PALETTE,
    },
  });
}

// Which theme each login role gets. Multiple roles can share one theme;
// reassign freely as roles change - this is just a starting mapping.
export const ROLE_THEME_MAP = {
  admin: 'clinicalBlue',
  doctor: 'careTeal',
  laboratorist: 'careTeal',
  reception1: 'vitalGreen',
  reception2: 'vitalGreen',
  queueScreen: 'vitalGreen',
  pharmacist: 'pharmaViolet',
  ipd: 'pharmaViolet',
  biller: 'slateNeutral',
  patient: 'slateNeutral',
};

export function getThemeKeyForRole(role) {
  return ROLE_THEME_MAP[role?.toLowerCase()] || 'clinicalBlue';
}
