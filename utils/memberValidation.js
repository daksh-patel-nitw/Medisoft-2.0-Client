// Field checks for the member forms (the Profile page and reception's edit dialog). They mirror the
// server's rules (Dtos/member.dto.ts) so a bad value is caught before the request; the server still
// re-checks everything. Each returns an error message, or '' when the value is fine.

const NAME = /^[\p{L}\p{M}\s'-]+$/u;
const ADDRESS = /^[\p{L}\p{M}\p{N}\-,.\s]+$/u;
const COLLEGE = /^[\p{L}\p{M}\p{N}\s.,'&()-]+$/u;
const CITY = /^[\p{L}\p{M}_]+$/u; // letters only - same as registration
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const required = (value) => (String(value ?? '').trim() === '' ? 'Required' : '');

export const validators = {
  name: (v) => required(v) || (NAME.test(v.trim()) ? '' : "Letters, spaces, ' and - only"),
  // an empty note is fine (it clears the field)
  note: (v) => (String(v ?? '').trim() === '' || NAME.test(v.trim()) ? '' : "Letters, spaces, ' and - only"),
  mobile: (v) => required(v) || (/^\d+$/.test(v.trim()) && Number(v) > 0 ? '' : 'Digits only'),
  pincode: (v) => required(v) || (/^\d+$/.test(v.trim()) && Number(v) > 0 ? '' : 'Digits only'),
  email: (v) => required(v) || (EMAIL.test(v.trim()) ? '' : 'Enter a valid email'),
  address: (v) => required(v) || (ADDRESS.test(v.trim()) ? '' : 'Letters, digits, commas, periods and spaces only'),
  college: (v) => required(v) || (COLLEGE.test(v.trim()) ? '' : "Letters, digits, spaces and . , ' & ( ) - only"),
  city: (v) => required(v) || (CITY.test(v.trim()) ? '' : 'Letters only'),
  positive: (v) => required(v) || (/^\d+(\.\d+)?$/.test(String(v).trim()) && Number(v) > 0 ? '' : 'Enter a number above 0'),
  dob: (v) => required(v) || (new Date(v) > new Date() ? 'Cannot be in the future' : ''),
};

/** The `YYYY-MM-DD` an <input type="date"> wants, from an ISO date string. */
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
